'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentProfile, requireRole } from '@/lib/auth'

const acceptedApplicationStatuses = ['approved', 'paid']

function assertUuid(value: string, label: string) {
  if (!/^[a-f0-9-]{36}$/i.test(value)) throw new Error(`${label}が不正です。`)
}

async function requireOrganizerEvent(eventId: string) {
  const session = await requireRole('organizer')
  const { data: organizer } = await session.supabase
    .from('organizers')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle()
  if (!organizer) throw new Error('主催者プロフィールが見つかりません。')
  const { data: event } = await session.supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .eq('organizer_id', organizer.id)
    .maybeSingle()
  if (!event) throw new Error('このイベントを操作する権限がありません。')
  return { ...session, event }
}

async function getVendorForUser(userId: string) {
  const session = await getCurrentProfile()
  const { data: vendor } = await session.supabase
    .from('vendors')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()
  return { ...session, vendor }
}

async function requireAcceptedApplication(eventId: string, vendorId: string, supabase: Awaited<ReturnType<typeof getCurrentProfile>>['supabase']) {
  const { data: application } = await supabase
    .from('applications')
    .select('id')
    .eq('event_id', eventId)
    .eq('vendor_id', vendorId)
    .in('status', acceptedApplicationStatuses)
    .maybeSingle()
  if (!application) throw new Error('承認済みの応募が必要です。')
  return application
}

export async function openDirectChat(eventId: string, vendorId: string) {
  assertUuid(eventId, 'イベント')
  assertUuid(vendorId, 'ベンダー')
  const session = await getCurrentProfile()
  if (!session.user || !session.profile) throw new Error('ログインが必要です。')

  if (session.profile.role === 'organizer') {
    await requireOrganizerEvent(eventId)
  } else if (session.profile.role === 'vendor') {
    const { vendor } = await getVendorForUser(session.user.id)
    if (!vendor || vendor.id !== vendorId) throw new Error('このチャットを開く権限がありません。')
  } else {
    throw new Error('このチャットを開く権限がありません。')
  }

  await requireAcceptedApplication(eventId, vendorId, session.supabase)
  const { data: existing } = await session.supabase
    .from('chat_threads')
    .select('id')
    .eq('event_id', eventId)
    .eq('type', 'direct')
    .eq('vendor_id', vendorId)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await session.supabase
    .from('chat_threads')
    .insert({ event_id: eventId, type: 'direct', vendor_id: vendorId })
    .select('id')
    .single()
  if (created) return created.id
  if (error?.code === '23505') {
    const { data: concurrentThread } = await session.supabase
      .from('chat_threads')
      .select('id')
      .eq('event_id', eventId)
      .eq('type', 'direct')
      .eq('vendor_id', vendorId)
      .single()
    if (concurrentThread) return concurrentThread.id
  }
  throw new Error('個別チャットを作成できませんでした。')
}

export async function openBroadcastChat(eventId: string) {
  assertUuid(eventId, 'イベント')
  const { supabase } = await requireOrganizerEvent(eventId)
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('event_id', eventId)
    .eq('type', 'broadcast')
    .is('vendor_id', null)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('chat_threads')
    .insert({ event_id: eventId, type: 'broadcast', vendor_id: null })
    .select('id')
    .single()
  if (created) return created.id
  if (error?.code === '23505') {
    const { data: concurrentThread } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('event_id', eventId)
      .eq('type', 'broadcast')
      .is('vendor_id', null)
      .single()
    if (concurrentThread) return concurrentThread.id
  }
  throw new Error('お知らせスレッドを作成できませんでした。')
}

export async function sendChatMessage(threadId: string, rawBody: string) {
  assertUuid(threadId, 'チャット')
  const body = rawBody.trim()
  if (!body || body.length > 4_000) throw new Error('メッセージは1〜4,000文字で入力してください。')
  const session = await getCurrentProfile()
  if (!session.user || !session.profile) throw new Error('ログインが必要です。')

  const { data: thread } = await session.supabase
    .from('chat_threads')
    .select('id, event_id, type, vendor_id')
    .eq('id', threadId)
    .maybeSingle()
  if (!thread) throw new Error('このチャットを閲覧する権限がありません。')

  if (thread.type === 'broadcast') {
    if (session.profile.role !== 'organizer') throw new Error('お知らせには返信できません。')
    await requireOrganizerEvent(thread.event_id)
  } else if (session.profile.role === 'organizer') {
    await requireOrganizerEvent(thread.event_id)
    if (!thread.vendor_id) throw new Error('チャットの参加者が不正です。')
    await requireAcceptedApplication(thread.event_id, thread.vendor_id, session.supabase)
  } else if (session.profile.role === 'vendor') {
    const { vendor } = await getVendorForUser(session.user.id)
    if (!vendor || vendor.id !== thread.vendor_id) throw new Error('このチャットへ送信する権限がありません。')
    await requireAcceptedApplication(thread.event_id, vendor.id, session.supabase)
  } else {
    throw new Error('このチャットへ送信する権限がありません。')
  }

  const { error } = await session.supabase
    .from('chat_messages')
    .insert({ thread_id: thread.id, sender_id: session.user.id, body })
  if (error) throw new Error('メッセージを送信できませんでした。')
  revalidatePath(`/organizer/events/${thread.event_id}/chat`)
  revalidatePath('/vendor/messages')
}
