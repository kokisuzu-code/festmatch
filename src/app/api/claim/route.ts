import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isApplicationClosed } from '@/lib/events'

export const runtime = 'nodejs'

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(request: Request) {
  let body: { token?: string }
  try { body = await request.json() as { token?: string } } catch { return NextResponse.json({ error: '応募リンクを確認してください。' }, { status: 400 }) }
  const token = body.token
  if (!token || !/^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(token)) return NextResponse.json({ error: '応募リンクを確認してください。' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data: pending } = await admin
    .from('pending_applications')
    .select('id, event_id, email, message, claimed_at, expires_at')
    .eq('claim_token_hash', tokenHash(token))
    .is('claimed_at', null)
    .gt('expires_at', now)
    .maybeSingle()
  if (!pending) return NextResponse.json({ error: 'この応募リンクは使用できないか、期限切れです。' }, { status: 410 })
  if (pending.email.toLowerCase() !== user.email.toLowerCase()) return NextResponse.json({ error: '応募に使用したメールアドレスでログインしてください。' }, { status: 403 })

  const { data: event } = await admin.from('events').select('starts_at, ends_at, application_deadline_at, status').eq('id', pending.event_id).maybeSingle()
  if (event?.status !== 'published' || isApplicationClosed(event)) return NextResponse.json({ error: 'このイベントの応募受付は終了しました。' }, { status: 409 })

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'ベンダープロフィールを作成してから、もう一度応募を完了してください。' }, { status: 409 })
  if (profile.role !== 'vendor') return NextResponse.json({ error: '主催者アカウントでは応募を完了できません。ベンダーアカウントをご利用ください。' }, { status: 403 })

  const { data: vendor } = await admin.from('vendors').select('id').eq('profile_id', user.id).maybeSingle()
  if (!vendor) return NextResponse.json({ error: 'ベンダープロフィールを作成してから、もう一度応募を完了してください。' }, { status: 409 })

  const { error: applicationError } = await admin.from('applications').insert({ event_id: pending.event_id, vendor_id: vendor.id, message: pending.message })
  if (applicationError && applicationError.code !== '23505') return NextResponse.json({ error: '正式応募を作成できませんでした。' }, { status: 500 })

  const { data: claimed, error: claimError } = await admin
    .from('pending_applications')
    .update({ claimed_at: now })
    .eq('id', pending.id)
    .is('claimed_at', null)
    .gt('expires_at', now)
    .select('id')
    .maybeSingle()
  if (claimError || !claimed) return NextResponse.json({ error: 'この応募リンクはすでに使用されています。' }, { status: 410 })
  return NextResponse.json({ ok: true })
}
