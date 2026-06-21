import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // admin or organizer のみ許可
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'organizer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { application_id, vendor_email, vendor_name, event_name, event_date, slot_name } =
    await request.json()

  const admin = createAdminClient()

  // ステータス更新
  await admin
    .from('applications')
    .update({ status: 'approved' })
    .eq('id', application_id)

  // メール送信
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: vendor_email,
    subject: `【FestMatch】出店申請が承認されました — ${event_name}`,
    html: `
      <p>${vendor_name} 様</p>
      <p>以下のイベントへの出店申請が承認されました。</p>
      <ul>
        <li>イベント名: ${event_name}</li>
        <li>開催日: ${event_date}</li>
        <li>スロット: ${slot_name}</li>
      </ul>
      <p>詳細はFestMatchダッシュボードをご確認ください。</p>
    `,
  })

  if (error) {
    console.error('[notify/approval] resend error', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message_id: data?.id })
}
