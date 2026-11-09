'use server'

import type { User } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createEventSlug } from "@/lib/events"
import { notifyVendorOfApplicationDecision } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasEventPublicationEntitlement } from '@/lib/organizer-entitlements'
import { isVendorGenre } from '@/lib/genres'
import { parseTokyoDate } from '@/lib/event-presentation'
import { boothConfigSchema } from '@/lib/booth-bidding'

type GenreSlotInput = { id?: string; genre: string; capacity: number }
type EventSpaceInput = { id?: string; label: string; genre: string | null }

const acceptedApplicationStatuses = ['approved', 'paid']

function stringValue(formData: FormData, field: string) { return String(formData.get(field) ?? "").trim() }

function optionalNumber(formData: FormData, field: string, options: { min?: number; max?: number; integer?: boolean } = {}) {
  const value = stringValue(formData, field)
  if (!value) return null
  const number = Number(value)
  if (!Number.isFinite(number) || (options.integer && !Number.isInteger(number)) || (options.min !== undefined && number < options.min) || (options.max !== undefined && number > options.max)) {
    throw new Error(`${field} の値を確認してください。`)
  }
  return number
}

function optionalDate(formData: FormData, field: string) {
  const value = stringValue(formData, field)
  if (!value) return null
  return parseTokyoDate(value)
}

function eventPayload(formData: FormData) {
  const title = stringValue(formData, "title")
  const startsAt = optionalDate(formData, "starts_at")
  const endsAt = optionalDate(formData, "ends_at")
  if (!title || title.length > 120 || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) throw new Error("イベント名と正しい開催日時を入力してください。")
  const applicationDeadlineAt = optionalDate(formData, "application_deadline_at")
  if (applicationDeadlineAt && new Date(applicationDeadlineAt) > new Date(startsAt)) throw new Error("応募締切は開催開始日時以前に設定してください。")
  if (stringValue(formData,'description').length > 5000 || stringValue(formData,'address').length > 500 || stringValue(formData,'cancellation_policy').length > 3000) throw new Error('説明・住所・キャンセル条件の文字数を確認してください。')
  return {
    title, description: stringValue(formData, "description") || null,
    prefecture: stringValue(formData, "prefecture"), address: stringValue(formData, "address") || null,
    starts_at: startsAt, ends_at: endsAt,
    application_deadline_at: applicationDeadlineAt, capacity: optionalNumber(formData, "capacity", { min: 1, max: 1000, integer: true }),
    booth_fee_yen: optionalNumber(formData, "booth_fee_yen", { min: 0, max: 1000000, integer: true }) ?? 0,
    has_power: formData.get('has_power') === 'on', has_water: formData.get('has_water') === 'on',
    cancellation_policy: stringValue(formData, 'cancellation_policy') || null,
    status: formData.get('status') === 'published' ? 'published' : 'draft',
  }
}

function eventDetails(formData: FormData, previous: Record<string, unknown> = {}) {
  const details = { ...previous }
  for (const key of ['venue_name', 'host_message', 'requirements', 'loading_info']) {
    const value = stringValue(formData, key)
    if (value.length > (key === 'venue_name' ? 200 : 3000)) throw new Error('案内文は3,000文字以内で入力してください。')
    details[key] = value
  }
  return details
}

function revalidateEvent(eventId: string, slug?: string | null) {
  for (const path of ['/organizer/events', `/organizer/events/${eventId}`, `/organizer/events/${eventId}/edit`, '/vendor/events', `/vendor/events/${eventId}`, '/festmap', '/home']) revalidatePath(path)
  if (slug) { revalidatePath(`/festmap/events/${slug}`); revalidatePath(`/embed/events/${slug}`) }
}

function genreSlotPayload(formData: FormData) {
  const raw = stringValue(formData, 'genre_slots')
  if (!raw) return []
  let slots: GenreSlotInput[]
  try {
    slots = JSON.parse(raw) as GenreSlotInput[]
  } catch {
    throw new Error('ジャンル別枠の内容を確認してください。')
  }
  validateSlotInputs(slots)
  return slots
}

async function uploadEventCover(
  supabase: Awaited<ReturnType<typeof requireRole>>['supabase'],
  eventId: string,
  formData: FormData,
  field = 'cover_photo',
) {
  const file = formData.get(field)
  if (!(file instanceof File) || file.size === 0) return null
  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const extension = extensionByType[file.type]
  if (!extension) throw new Error('イベント写真はJPG・PNG・WebP形式で選択してください。')
  if (file.size > 6 * 1024 * 1024) throw new Error('イベント写真は6MB以下にしてください。')
  const path = `${eventId}/${field === 'booth_map' ? 'booth-map' : 'cover'}-${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('event-images').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error('イベント写真を保存できませんでした。')
  return path
}

async function ensureEventPublicationEntitlement(supabase: Awaited<ReturnType<typeof requireRole>>['supabase'], organizerId: string, eventId: string, status: string, user: User) {
  if (status !== 'published') return
  if (!await hasEventPublicationEntitlement(supabase, organizerId, eventId, user)) {
    throw new Error('公開には年間契約、またはこのイベント用の有効なスポット契約が必要です。')
  }
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireRole("organizer")
  const { data: organizer } = await supabase.from("organizers").select("id").eq("profile_id", user.id).single()
  if (!organizer) throw new Error("主催者プロフィールが見つかりません。")
  const payload = eventPayload(formData)
  const genreSlots = genreSlotPayload(formData)
  const enabled = formData.get('booth_bidding_enabled') === 'on'
  let rawSpaces: unknown
  try { rawSpaces = JSON.parse(stringValue(formData,'booth_spaces') || '[]') } catch { throw new Error('区画の内容を確認してください。') }
  const config = boothConfigSchema.safeParse({ version:0, enabled, mapPath:null, spaces:rawSpaces, slots:genreSlots })
  if (!config.success) throw new Error('区画番号・最低額・ジャンルの設定を確認してください。')
  if (genreSlots.reduce((sum,slot) => sum + slot.capacity,0) > (payload.capacity ?? 1000)) throw new Error('ジャンル枠の合計が募集台数を超えています。')
  if (!payload.prefecture) throw new Error("都道府県を選択してください。")
  if (payload.status === 'published') throw new Error('新規イベントは下書きで保存してください。公開はイベント詳細から開始できます。')
  const { data, error } = await supabase.from("events").insert({ ...payload, operations_info:eventDetails(formData), booth_bidding_enabled: false, organizer_id: organizer.id, slug: createEventSlug(payload.title) }).select("id").single()
  if (error || !data) throw new Error("イベントを保存できませんでした。")
  const uploaded: string[] = []
  try {
    const coverPath = await uploadEventCover(supabase, data.id, formData)
    if (coverPath) uploaded.push(coverPath)
    const mapPath = await uploadEventCover(supabase, data.id, formData, 'booth_map')
    if (mapPath) uploaded.push(mapPath)
    if (enabled && (!mapPath || !config.data.spaces.length)) throw new Error('区画図と1つ以上の区画を設定してください。')
    if (coverPath) {
      const { error } = await supabase.from('events').update({ cover_photo_path:coverPath }).eq('id',data.id)
      if (error) throw error
    }
    const { error } = await createAdminClient().rpc('save_booth_config', { p_event:data.id, p_profile:user.id, p_version:0, p_enabled:enabled, p_map:mapPath, p_spaces:config.data.spaces, p_slots:genreSlots })
    if (error) throw new Error(error.message)
  } catch (error) {
    await supabase.from('events').delete().eq('id',data.id)
    if (uploaded.length) await supabase.storage.from('event-images').remove(uploaded)
    throw new Error(error instanceof Error ? error.message : '保存できませんでした。入力内容を確認してください。')
  }
  revalidateEvent(data.id)
  redirect(`/organizer/events/${data.id}`)
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { supabase, user } = await requireRole("organizer")
  const payload = eventPayload(formData)
  if (!payload.prefecture) throw new Error("都道府県を選択してください。")
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  if (!organizer) throw new Error('主催者プロフィールが見つかりません。')
  const { data: current } = await supabase.from('events').select('*').eq('id',eventId).eq('organizer_id',organizer.id).maybeSingle()
  if (!current) throw new Error('このイベントを編集する権限がありません。')
  payload.status = current.status
  const [{count:applications,error:ae},{count:bids,error:be}] = await Promise.all([
    supabase.from('applications').select('id',{count:'exact',head:true}).eq('event_id',eventId),
    supabase.from('booth_bids').select('id',{count:'exact',head:true}).eq('event_id',eventId),
  ])
  if (ae || be) throw new Error('応募状況を確認できませんでした。もう一度お試しください。')
  if (applications || bids) {
    for (const key of ['starts_at','ends_at','application_deadline_at','capacity','booth_fee_yen','status'] as const) {
      if (payload[key] !== current[key] && !(key.endsWith('_at') && Date.parse(String(payload[key])) === Date.parse(String(current[key])))) throw new Error('応募受付後は日時・出店料・募集台数・締切・公開状態を変更できません。説明・画像・案内は編集できます。')
    }
  }
  await ensureEventPublicationEntitlement(supabase, organizer.id, eventId, payload.status, user)
  const coverPath = await uploadEventCover(supabase, eventId, formData)
  const update = { ...payload, operations_info:eventDetails(formData,current.operations_info ?? {}), ...(coverPath ? {cover_photo_path:coverPath} : {}) }
  const { data:saved, error } = await supabase.from('events').update(update).eq('id',eventId).eq('organizer_id',organizer.id).eq('updated_at',current.updated_at).select('id').maybeSingle()
  if (error || !saved) {
    if (coverPath) await supabase.storage.from('event-images').remove([coverPath])
    throw new Error(error?.message || '別の操作で情報が更新されました。再読み込みして確認してください。')
  }
  revalidateEvent(eventId,current.slug)
  redirect(`/organizer/events/${eventId}`)
}

export async function setEventPublished(eventId: string, isPublished: boolean) {
  const { supabase, user } = await requireRole("organizer")
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  if (!organizer) throw new Error('主催者プロフィールが見つかりません。')
  await ensureEventPublicationEntitlement(supabase, organizer.id, eventId, isPublished ? 'published' : 'draft', user)
  const { error } = await supabase.from("events").update({ status: isPublished ? 'published' : 'draft' }).eq("id", eventId)
  if (error) throw new Error("公開状態を更新できませんでした。")
  revalidatePath(`/organizer/events/${eventId}`); revalidatePath("/organizer/events")
}

export async function decideApplication(applicationId: string, status: "approved" | "rejected", spaceId?: string) {
  const { supabase } = await requireRole("organizer")
  const { data: application } = await supabase
    .from("applications")
    .select("id, event_id, vendor_id, status, vendor_genre_snapshot, events(title)")
    .eq("id", applicationId)
    .single()
  if (!application) throw new Error("応募が見つかりません。")
  if (application.status !== 'pending') throw new Error('未対応の応募だけを更新できます。')

  let selectedSpace: { id: string; label: string; genre: string | null; assigned_application_id: string | null } | null = null
  if (status === 'approved') {
    const [{ data: slots }, { data: acceptedApplications }, { data: spaces }] = await Promise.all([
      supabase.from('event_genre_slots').select('genre, capacity').eq('event_id', application.event_id),
      supabase.from('applications').select('vendor_genre_snapshot').eq('event_id', application.event_id).in('status', acceptedApplicationStatuses),
      supabase.from('event_spaces').select('id, label, genre, assigned_application_id').eq('event_id', application.event_id),
    ])
    const matchingSlot = (slots ?? []).find((slot) => slot.genre === application.vendor_genre_snapshot)
    if (matchingSlot) {
      const used = (acceptedApplications ?? []).filter((item) => item.vendor_genre_snapshot === matchingSlot.genre).length
      if (used >= matchingSlot.capacity) throw new Error(`${matchingSlot.genre}枠は満了です。`)
    }

    if ((spaces ?? []).length) {
      if (!spaceId) throw new Error('承認には出店区画の割当が必要です。')
      selectedSpace = (spaces ?? []).find((space) => space.id === spaceId) ?? null
      if (!selectedSpace || selectedSpace.assigned_application_id) throw new Error('選択した区画はすでに割り当て済みです。')
      if (selectedSpace.genre && selectedSpace.genre !== application.vendor_genre_snapshot) {
        throw new Error('ベンダーのジャンルに合う区画を選択してください。')
      }
    }
  }

  const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId).eq("status", "pending")
  if (error) throw new Error(error.message.includes("capacity") ? "募集枠に達しているため承認できません。" : "応募状態を更新できませんでした。")
  if (selectedSpace) {
    const { error: assignmentError } = await supabase
      .from('event_spaces')
      .update({ assigned_application_id: application.id })
      .eq('id', selectedSpace.id)
      .is('assigned_application_id', null)
    if (assignmentError) throw new Error('承認は完了しましたが、区画の割当が競合しました。承認済み一覧から割り当ててください。')
  }
  const event = application.events as { title?: string } | null
  const { data: vendor } = await createAdminClient().from("vendors").select("profile_id").eq("id", application.vendor_id).maybeSingle()
  if (event?.title && vendor?.profile_id) await notifyVendorOfApplicationDecision({ vendorOwnerId: vendor.profile_id, eventTitle: event.title, status }).catch(() => undefined)
  revalidatePath("/organizer/events")
  revalidatePath(`/organizer/events/${application.event_id}`)
  revalidatePath('/vendor/applications')
}

function validateSlotInputs(slots: GenreSlotInput[]) {
  const genres = new Set<string>()
  const ids = new Set<string>()
  for (const slot of slots) {
    slot.genre = slot.genre.trim()
    if (!isVendorGenre(slot.genre) || !Number.isInteger(slot.capacity) || slot.capacity < 0) {
      throw new Error('ジャンル別枠の内容を確認してください。')
    }
    if (genres.has(slot.genre)) throw new Error('同じジャンルの枠は1つだけ登録できます。')
    if (slot.id && (ids.has(slot.id) || !/^[a-f0-9-]{36}$/i.test(slot.id))) throw new Error('ジャンル別枠の指定が不正です。')
    genres.add(slot.genre)
    if (slot.id) ids.add(slot.id)
  }
}

function validateSpaceInputs(spaces: EventSpaceInput[]) {
  const labels = new Set<string>()
  const ids = new Set<string>()
  for (const space of spaces) {
    space.label = space.label.trim()
    space.genre = space.genre?.trim() || null
    if (space.genre && !isVendorGenre(space.genre)) throw new Error('区画のジャンルは共通一覧から選択してください。')
    if (!space.label || space.label.length > 80) throw new Error('区画ラベルを確認してください。')
    if (labels.has(space.label)) throw new Error('同じ区画ラベルは登録できません。')
    if (space.id && (ids.has(space.id) || !/^[a-f0-9-]{36}$/i.test(space.id))) throw new Error('区画の指定が不正です。')
    labels.add(space.label)
    if (space.id) ids.add(space.id)
  }
}

/** Saves only slot/space configuration. Assignment is handled by the approval flow. */
export async function saveEventCapacitySettings(eventId: string, slots: GenreSlotInput[], spaces: EventSpaceInput[]) {
  if (!/^[a-f0-9-]{36}$/i.test(eventId)) throw new Error('イベントが不正です。')
  validateSlotInputs(slots)
  validateSpaceInputs(spaces)
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: event } = organizer
    ? await supabase.from('events').select('id').eq('id', eventId).eq('organizer_id', organizer.id).maybeSingle()
    : { data: null }
  if (!event) throw new Error('このイベントを編集する権限がありません。')

  const [{ data: currentSlots }, { data: currentSpaces }] = await Promise.all([
    supabase.from('event_genre_slots').select('id').eq('event_id', eventId),
    supabase.from('event_spaces').select('id, assigned_application_id').eq('event_id', eventId),
  ])
  const currentSlotIds = new Set((currentSlots ?? []).map((slot) => slot.id))
  const currentSpaceById = new Map((currentSpaces ?? []).map((space) => [space.id, space]))
  if (slots.some((slot) => slot.id && !currentSlotIds.has(slot.id))) throw new Error('ジャンル別枠の指定が不正です。')
  if (spaces.some((space) => space.id && !currentSpaceById.has(space.id))) throw new Error('区画の指定が不正です。')

  const retainedSlotIds = new Set(slots.flatMap((slot) => slot.id ? [slot.id] : []))
  const retainedSpaceIds = new Set(spaces.flatMap((space) => space.id ? [space.id] : []))
  const removedAssignedSpace = (currentSpaces ?? []).find((space) => !retainedSpaceIds.has(space.id) && space.assigned_application_id)
  if (removedAssignedSpace) throw new Error('割当済みの区画は削除できません。先に応募一覧から割当を解除してください。')

  const slotUpdates = slots.filter((slot) => slot.id)
  const slotCreates = slots.filter((slot) => !slot.id)
  const spaceUpdates = spaces.filter((space) => space.id)
  const spaceCreates = spaces.filter((space) => !space.id)

  for (const slot of slotUpdates) {
    const { error } = await supabase.from('event_genre_slots').update({ genre: slot.genre, capacity: slot.capacity }).eq('id', slot.id!)
    if (error) throw new Error('ジャンル別枠を更新できませんでした。')
  }
  if (slotCreates.length) {
    const { error } = await supabase.from('event_genre_slots').insert(slotCreates.map((slot) => ({ event_id: eventId, genre: slot.genre, capacity: slot.capacity })))
    if (error) throw new Error('ジャンル別枠を登録できませんでした。')
  }
  const slotsToDelete = (currentSlots ?? []).filter((slot) => !retainedSlotIds.has(slot.id)).map((slot) => slot.id)
  if (slotsToDelete.length) {
    const { error } = await supabase.from('event_genre_slots').delete().in('id', slotsToDelete)
    if (error) throw new Error('ジャンル別枠を削除できませんでした。')
  }

  for (const space of spaceUpdates) {
    const { error } = await supabase.from('event_spaces').update({ label: space.label, genre: space.genre }).eq('id', space.id!)
    if (error) throw new Error('区画を更新できませんでした。')
  }
  if (spaceCreates.length) {
    const { error } = await supabase.from('event_spaces').insert(spaceCreates.map((space) => ({ event_id: eventId, label: space.label, genre: space.genre })))
    if (error) throw new Error('区画を登録できませんでした。')
  }
  const spacesToDelete = (currentSpaces ?? []).filter((space) => !retainedSpaceIds.has(space.id)).map((space) => space.id)
  if (spacesToDelete.length) {
    const { error } = await supabase.from('event_spaces').delete().in('id', spacesToDelete)
    if (error) throw new Error('区画を削除できませんでした。')
  }

  revalidatePath(`/organizer/events/${eventId}`)
  revalidatePath(`/organizer/events/${eventId}/edit`)
  revalidatePath('/vendor/events')
}

export async function assignEventSpace(eventId: string, applicationId: string, spaceId: string | null) {
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: event } = organizer
    ? await supabase.from('events').select('id').eq('id', eventId).eq('organizer_id', organizer.id).maybeSingle()
    : { data: null }
  if (!event) throw new Error('このイベントを操作する権限がありません。')
  const { data: application } = await supabase
    .from('applications')
    .select('id, status, vendor_genre_snapshot')
    .eq('id', applicationId)
    .eq('event_id', eventId)
    .maybeSingle()
  if (!application || !acceptedApplicationStatuses.includes(application.status as 'approved' | 'paid')) {
    throw new Error('承認済みの応募だけに区画を割り当てられます。')
  }

  const { data: spaces } = await supabase
    .from('event_spaces')
    .select('id, label, genre, assigned_application_id')
    .eq('event_id', eventId)
  if (!spaceId) {
    const { error } = await supabase.from('event_spaces').update({ assigned_application_id: null }).eq('event_id', eventId).eq('assigned_application_id', application.id)
    if (error) throw new Error('区画の割当を解除できませんでした。')
  } else {
    const target = (spaces ?? []).find((space) => space.id === spaceId)
    if (!target || (target.assigned_application_id && target.assigned_application_id !== application.id)) throw new Error('選択した区画はすでに割り当て済みです。')
    if (target.genre && target.genre !== application.vendor_genre_snapshot) throw new Error('ベンダーのジャンルに合う区画を選択してください。')
    if (target.assigned_application_id !== application.id) {
      const { error: clearError } = await supabase.from('event_spaces').update({ assigned_application_id: null }).eq('event_id', eventId).eq('assigned_application_id', application.id)
      if (clearError) throw new Error('以前の区画の割当を解除できませんでした。')
      const { error: setError } = await supabase.from('event_spaces').update({ assigned_application_id: application.id }).eq('id', target.id).is('assigned_application_id', null)
      if (setError) throw new Error('区画を割り当てられませんでした。')
    }
  }
  revalidatePath(`/organizer/events/${eventId}`)
  revalidatePath('/vendor/applications')
}
