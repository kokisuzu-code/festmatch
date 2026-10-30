import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/auth'
import { operationAllowed, operationSchema, type OperationData } from '@/lib/event-operations'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ eventId: string }> }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

async function access(eventId: string) {
  if (!z.string().uuid().safeParse(eventId).success) return { response: json({ error: 'イベントの指定が不正です。' }, 400) }
  const session = await getCurrentProfile()
  if (!session.user) return { response: json({ error: 'ログインし直してください。' }, 401) }
  const { supabase, user } = session
  const { data: event, error } = await supabase.from('events').select('id,title,starts_at,ends_at,slug,address,prefecture,organizer_id').eq('id', eventId).maybeSingle()
  if (error) return { response: json({ error: 'イベントを読み込めませんでした。時間をおいて再試行してください。' }, 503) }
  if (!event) return { response: json({ error: 'このイベントを表示する権限がありません。' }, 403) }
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).eq('id', event.organizer_id).maybeSingle()
  if (organizer && ['organizer', 'admin'].includes(session.profile?.role ?? '')) return { supabase, user, event, role: 'organizer' as const }
  const { data: vendor } = await supabase.from('vendors').select('id,name,genre').eq('profile_id', user.id).maybeSingle()
  const { data: application } = vendor && session.profile?.role === 'vendor' ? await supabase.from('applications').select('id').eq('event_id', eventId).eq('vendor_id', vendor.id).in('status', ['approved', 'paid']).maybeSingle() : { data: null }
  if (!application) return { response: json({ error: '承認済みのイベントだけを表示できます。' }, 403) }
  return { supabase, user, event, vendor, role: 'vendor' as const }
}

export async function GET(_request: Request, { params }: Context) {
  const { eventId } = await params
  const session = await access(eventId)
  if ('response' in session) return session.response
  const { supabase, event, role } = session
  const results = await Promise.all([
    supabase.from('applications').select('id,vendor_id,vendor_genre_snapshot').eq('event_id', eventId).in('status', ['approved', 'paid']).order('created_at'),
    supabase.from('event_spaces').select('id,label,assigned_application_id').eq('event_id', eventId).order('label'),
    supabase.from('event_stall_states').select('application_id,status,version,updated_at').eq('event_id', eventId),
    supabase.from('event_operation_checks').select('application_id,kind,source,state,version').eq('event_id', eventId),
    supabase.from('event_run_items').select('id,title,scheduled_at,completed_at,version').eq('event_id', eventId).order('scheduled_at'),
    supabase.from('event_incidents').select('id,application_id,kind,priority,title,location,assignee,state,note,photo_path,version,created_at').eq('event_id', eventId).order('created_at', { ascending: false }),
    supabase.from('event_announcements').select('id,body,requires_ack,created_at').eq('event_id', eventId).order('created_at', { ascending: false }).limit(50),
    supabase.from('event_announcement_receipts').select('announcement_id,vendor_id,read_at,acknowledged_at').eq('event_id', eventId),
    supabase.from('event_operation_settings').select('map_path,map_confirmed_at,version').eq('event_id', eventId).maybeSingle(),
    supabase.from('event_map_pins').select('space_id,x,y').eq('event_id', eventId),
  ])
  if (results.some(result => result.error)) return json({ error: '当日運営データを読み込めませんでした。再読み込みしてください。' }, 503)
  const [applications, spaces, states, checks, timeline, incidents, announcements, receipts, settings, pins] = results
  const acceptedApplications = new Set((applications.data ?? []).map(app => app.id))
  const vendorIds = [...new Set((applications.data ?? []).map(app => app.vendor_id))]
  const { data: vendors, error: vendorError } = vendorIds.length ? await supabase.from('vendors_public').select('id,name,genre').in('id', vendorIds) : { data: [], error: null }
  if (vendorError) return json({ error: 'ベンダー情報を読み込めませんでした。' }, 503)
  let mapUrl: string | null = null
  if (settings.data?.map_path) {
    const signed = await supabase.storage.from('event-operations').createSignedUrl(settings.data.map_path, 3600)
    if (signed.error) return json({ error: '保存済みの会場図を読み込めませんでした。再読み込みしてください。' }, 503)
    mapUrl = signed.data.signedUrl
  }
  const data = {
    role, event, spaces: spaces.data,
    states: states.data?.filter(row => acceptedApplications.has(row.application_id)),
    checks: checks.data?.filter(row => acceptedApplications.has(row.application_id)),
    timeline: timeline.data, incidents: incidents.data,
    announcements: announcements.data, receipts: receipts.data, settings: settings.data, pins: pins.data, mapUrl,
    applications: (applications.data ?? []).map(app => {
      const vendor = 'vendor' in session && session.vendor?.id === app.vendor_id ? session.vendor : vendors?.find(v => v.id === app.vendor_id)
      const space = spaces.data?.find(s => s.assigned_application_id === app.id)
      return { id: app.id, vendor_id: app.vendor_id, name: vendor?.name ?? 'ベンダー（公開名未設定）', genre: app.vendor_genre_snapshot ?? vendor?.genre ?? '未設定', label: space?.label ?? '区画未割当', space_id: space?.id ?? null }
    }),
  } as OperationData
  return json(data)
}

export async function PATCH(request: Request, { params }: Context) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'この操作は同じサイトから行ってください。' }, 403)
  const { eventId } = await params
  const session = await access(eventId)
  if ('response' in session) return session.response
  const input = operationSchema.safeParse(await request.json().catch(() => null))
  if (!input.success) return json({ error: '入力内容を確認してください。文字数・日時・選択項目が不正です。' }, 400)
  if (!operationAllowed(session.role, input.data)) return json({ error: 'この操作を行う権限がありません。' }, 403)
  // The existing RPC replaces check notes/photos. Preserve evidence when this UI
  // only updates the check state; the version guard still rejects stale writes.
  let payload: Record<string, unknown> = input.data.payload
  if (input.data.command === 'check') {
    const { application_id, kind, source } = input.data.payload
    const current = await session.supabase.from('event_operation_checks').select('note,photo_path').eq('event_id', eventId).eq('application_id', application_id).eq('kind', kind).eq('source', source).maybeSingle()
    if (current.error) return json({ error: '現在の確認内容を読み込めませんでした。再試行してください。' }, 503)
    if (current.data) payload = { ...payload, note: current.data.note, photo_path: current.data.photo_path }
  }
  const { error } = await session.supabase.rpc('apply_event_operation', {
    p_event_id: eventId, p_request_id: input.data.requestId, p_command: input.data.command, p_payload: payload,
  })
  if (error?.code === '40001') return json({ error: '別の端末で更新されています。最新の状態を確認して、もう一度操作してください。' }, 409)
  if (error?.code === '42501') return json({ error: 'このイベントやベンダーを更新する権限がありません。' }, 403)
  if (error) return json({ error: '保存できませんでした。最新の状態と入力内容を確認してください。' }, 400)
  return json({ ok: true })
}
