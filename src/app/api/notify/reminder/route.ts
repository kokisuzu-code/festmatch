import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'


export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizer_email, organizer_name, event_name, days_until_event, fill_rate } =
    await request.json()

  const fillPercent = Math.round(fill_rate * 100)

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: organizer_email,
    subject: `【FestMatch】${event_name} のスロット充足率が ${fillPercent}% です`,
    html: `
      <p>${organizer_name} 様</p>
      <p>${event_name} の開催まで残り <strong>${days_until_event}日</strong> となりましたが、
      スロット充足率が <strong>${fillPercent}%</strong> にとどまっています。</p>
      <p>ダッシュボードから追加募集やタイムセール設定をご検討ください。</p>
    `,
  })

  if (error) {
    console.error('[notify/reminder] resend error', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message_id: data?.id })
}
