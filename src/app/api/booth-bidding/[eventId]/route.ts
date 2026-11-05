import { isVendorGenre } from '@/lib/genres'
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { boothBidSchema, boothConfigSchema } from '@/lib/booth-bidding'
import { getBoothBidding } from '@/lib/booth-bidding-server'
import { revalidatePath } from 'next/cache'

async function context(params: Promise<{ eventId: string }>) {
  const { eventId } = await params
  if (!/^[a-f0-9-]{36}$/i.test(eventId)) return null
  const session = await getCurrentProfile()
  if (!session.user || !session.profile) return null
  const { data: event } = await session.supabase.from('events').select('id, organizer_id, status, booth_bidding_enabled, booth_bidding_finalized_at, starts_at, application_deadline_at').eq('id', eventId).maybeSingle()
  if (!event) return null
  const { data: organizer } = await session.supabase.from('organizers').select('id').eq('profile_id', session.user.id).maybeSingle()
  return { ...session, user: session.user, event, isOrganizer: organizer?.id === event.organizer_id }
}
function failure(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : '処理できませんでした。再度お試しください。' }, { status })
}
function refresh(eventId: string) {
  revalidatePath(`/organizer/events/${eventId}`); revalidatePath(`/organizer/events/${eventId}/edit`)
  revalidatePath(`/vendor/events/${eventId}`); revalidatePath('/vendor/applications'); revalidatePath('/vendor/events')
}
export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const ctx = await context(params)
    if (!ctx || (!ctx.isOrganizer && (ctx.profile?.role !== 'vendor' || ctx.event.status !== 'published'))) return failure(new Error('ログインと閲覧権限を確認してください。'), 403)
    const { data: vendor } = await ctx.supabase.from('vendors').select('id').eq('profile_id', ctx.user.id).maybeSingle()
    const { bids, ...publicData } = await getBoothBidding(ctx.event.id, vendor?.id)
    return NextResponse.json(ctx.isOrganizer ? { ...publicData, bids, finalizedAt: ctx.event.booth_bidding_finalized_at } : { ...publicData, spaces: publicData.spaces.map(({ assigned_application_id: _assignment, ...space }) => space), finalizedAt: ctx.event.booth_bidding_finalized_at }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error, 500) }
}
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const ctx = await context(params)
    if (!ctx || ctx.profile?.role !== 'vendor') return failure(new Error('出店者としてログインしてください。'), 403)
    const { data: vendor } = await ctx.supabase.from('vendors').select('genre').eq('profile_id', ctx.user.id).maybeSingle()
    if (!isVendorGenre(vendor?.genre)) return failure(new Error('プロフィールでメインのジャンルを選択してください。'), 409)
    const parsed = boothBidSchema.safeParse(await request.json())
    if (!parsed.success) return failure(new Error('提示額・希望区画・確認欄を確認してください。'))
    const input = parsed.data
    const { data, error } = await createAdminClient().rpc('submit_booth_bid', { p_event: ctx.event.id, p_profile: ctx.user.id, p_amount: input.amount, p_preferences: input.preferences, p_message: input.message, p_version: input.version })
    if (error) return failure(new Error(error.message), 409)
    refresh(ctx.event.id)
    const savedBid = Array.isArray(data) ? data[0] : data
    if (!savedBid?.id) return failure(new Error('応募の保存結果を確認できませんでした。再読み込みして確認してください。'), 500)
    return NextResponse.json({ ok: true, bid: savedBid })
  } catch (error) { return failure(error) }
}
export async function PUT(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const ctx = await context(params)
    if (!ctx?.isOrganizer) return failure(new Error('このイベントの主催者だけが編集できます。'), 403)
    const parsed = boothConfigSchema.safeParse(await request.json())
    if (!parsed.success) return failure(new Error('区画番号・ジャンル・最低額・位置・上限を確認してください。'))
    const input = parsed.data
    const { error } = await createAdminClient().rpc('save_booth_config', { p_event: ctx.event.id, p_profile: ctx.user.id, p_version: input.version, p_enabled: input.enabled, p_map: input.mapPath, p_spaces: input.spaces, p_slots: input.slots })
    if (error) return failure(new Error(error.message), 409)
    refresh(ctx.event.id)
    return NextResponse.json({ ok: true })
  } catch (error) { return failure(error) }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const ctx = await context(params)
    if (!ctx?.isOrganizer) return failure(new Error('このイベントの主催者だけが確定できます。'), 403)
    const input = await request.json()
    if (input.confirm !== true || typeof input.fingerprint !== 'string' || input.fingerprint.length > 100000) return failure(new Error('割当結果と確定確認欄を確認してください。'))
    const { data, error } = await createAdminClient().rpc('finalize_booth_bids', { p_event: ctx.event.id, p_profile: ctx.user.id, p_expected: input.fingerprint })
    if (error) return failure(new Error(error.message), 409)
    refresh(ctx.event.id)
    return NextResponse.json({ ok: true, approved: data })
  } catch (error) { return failure(error) }
}
