import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: NextRequest) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: apps } = await supabaseAdmin
    .from('applications')
    .select(`
      id, genre, space_no,
      events ( title, date, location, start_time ),
      vendors ( profiles ( name, email ) )
    `)
    .eq('status', 'approved')
    .eq('events.date', tomorrowStr)

  if (!apps?.length) return NextResponse.json({ sent: 0 })

  for (const app of apps) {
    const vendorEmail = (app.vendors as any)?.profiles?.email
    const vendorName  = (app.vendors as any)?.profiles?.name
    const event       = app.events as any

    if (!vendorEmail) continue

    await resend.emails.send({
      from: 'FestMatch <noreply@festmatch.jp>',
      to: vendorEmail,
      subject: `【明日】${event.title} 出店リマインド`,
      html: `
        <p>${vendorName} 様</p>
        <p>明日は ${event.title}（${event.location}）への出店日です。</p>
        <p>開始時間：${event.start_time ?? '詳細はアプリでご確認ください'}</p>
        <p>出店スペース：${(app as any).space_no ?? '主催者にご確認ください'}</p>
      `,
    })
  }

  return NextResponse.json({ sent: apps.length })
}
