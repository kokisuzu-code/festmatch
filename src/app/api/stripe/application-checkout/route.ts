import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { APP_URL } from '@/lib/app'

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })

  let body: { application_id?: string }
  try { body = await request.json() as { application_id?: string } } catch { return NextResponse.json({ error: '送信内容を確認してください。' }, { status: 400 }) }
  if (!isUuid(body.application_id)) return NextResponse.json({ error: '応募が指定されていません。' }, { status: 400 })

  const { data: vendor } = await supabase.from('vendors').select('id, name, subscription_tier').eq('profile_id', user.id).maybeSingle()
  if (!vendor) return NextResponse.json({ error: 'ベンダープロフィールがありません。' }, { status: 403 })
  const { data: application } = await supabase.from('applications').select('id, status, event_id').eq('id', body.application_id).eq('vendor_id', vendor.id).maybeSingle()
  if (!application || application.status !== 'approved') return NextResponse.json({ error: '支払い可能な応募が見つかりません。' }, { status: 409 })

  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('id, title, booth_fee_yen, organizer_id, ends_at, status')
    .eq('id', application.event_id)
    .maybeSingle()
  if (!event?.id || !event.title || event.status !== 'published' || new Date(event.ends_at) <= new Date()) return NextResponse.json({ error: 'このイベントは現在決済できません。' }, { status: 409 })

  const feeAmount = event.booth_fee_yen ?? 0
  if (feeAmount === 0) {
    const { error } = await admin
      .from('applications')
      .update({ status: 'paid', booth_fee_yen_snapshot: 0, platform_fee_yen: 0 })
      .eq('id', application.id)
      .eq('status', 'approved')
    if (error) return NextResponse.json({ error: '無料の出店料を確定できませんでした。' }, { status: 500 })
    return NextResponse.json({ url: `${APP_URL}/vendor/applications?payment=free` })
  }

  // Destination charges must use a verified organizer Connect account. The
  // current source-of-truth schema intentionally has no organizer account
  // field, so never create a platform charge that could route funds wrongly.
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripeが設定されていません。' }, { status: 503 })
  return NextResponse.json({ error: '出店料決済は、主催者の Stripe Connect 情報を保存するスキーマ追加後に有効化されます。無料イベントはそのまま確定できます。' }, { status: 503 })
}
