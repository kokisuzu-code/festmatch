import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isApplicationClosed } from '@/lib/events'
import { sendEmail } from '@/lib/resend'
import { APP_URL } from '@/lib/app'

export const runtime = 'nodejs'

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

export async function POST(request: Request) {
  let body: { event_id?: string; email?: string; vendor_name?: string; genre?: string; message?: string }
  try { body = await request.json() as typeof body } catch { return NextResponse.json({ error: '送信内容を確認してください。' }, { status: 400 }) }

  const email = body.email?.trim().toLowerCase()
  const vendorName = body.vendor_name?.trim()
  const message = body.message?.trim() || null
  if (!body.event_id || !/^[a-f0-9-]{36}$/i.test(body.event_id) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !vendorName) return NextResponse.json({ error: 'メールアドレスとベンダー名を入力してください。' }, { status: 400 })
  if (vendorName.length > 100 || message?.length && message.length > 2_000) return NextResponse.json({ error: '入力内容の文字数を確認してください。' }, { status: 400 })

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('id, title, starts_at, ends_at, application_deadline_at, status').eq('id', body.event_id).maybeSingle()
  if (event?.status !== 'published' || isApplicationClosed(event)) return NextResponse.json({ error: 'このイベントは現在応募を受け付けていません。' }, { status: 409 })

  const rateLimitSince = new Date(Date.now() - 15 * 60_000).toISOString()
  const { count } = await admin
    .from('pending_applications')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('email', email)
    .gte('created_at', rateLimitSince)
  if ((count ?? 0) >= 3) return NextResponse.json({ error: 'しばらく時間をおいてから、もう一度お試しください。' }, { status: 429 })

  const claimToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString()
  const { error } = await admin.from('pending_applications').insert({
    event_id: event.id,
    email,
    vendor_name: vendorName,
    genre: body.genre?.trim().slice(0, 100) || null,
    message,
    claim_token_hash: tokenHash(claimToken),
    expires_at: expiresAt,
  })
  if (error) return NextResponse.json({ error: '応募を一時保存できませんでした。' }, { status: 500 })

  const callbackUrl = `${APP_URL}/auth/callback?claim=${encodeURIComponent(claimToken)}&role=vendor`
  let actionUrl = `${APP_URL}/signup?claim=${encodeURIComponent(claimToken)}&email=${encodeURIComponent(email)}`
  try {
    const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: callbackUrl } })
    if (generated.data.properties?.action_link) actionUrl = generated.data.properties.action_link
  } catch {
    // The fallback directs a new user through the same email-confirmed signup.
  }
  await sendEmail({
    to: email,
    subject: `${event.title} への応募を続ける`,
    html: `<p>${escapeHtml(event.title)} への応募を受け付けました。</p><p><a href="${actionUrl}">メールアドレスを確認して応募を完了する</a></p><p>このリンクは24時間で失効します。</p>`,
  }).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
