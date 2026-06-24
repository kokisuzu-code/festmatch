import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = await createClient()
  const { application_id } = await req.json()

  const { data: app } = await supabase
    .from('applications')
    .select(`
      id, genre, space_no,
      events ( title, date, location ),
      vendors ( profiles ( name, email ) )
    `)
    .eq('id', application_id)
    .single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const vendorEmail = (app.vendors as any)?.profiles?.email
  const vendorName  = (app.vendors as any)?.profiles?.name
  const event       = app.events as any

  await resend.emails.send({
    from: 'FestMatch <noreply@festmatch.jp>',
    to: vendorEmail,
    subject: `【承認】${event.title} への出店が確定しました`,
    html: `
      <p>${vendorName} 様</p>
      <p>${event.title}（${event.date}・${event.location}）への出店が承認されました。</p>
      <p>出店スペース：<strong>${(app as any).space_no ?? '追って連絡'}</strong></p>
      <p>ジャンル：${app.genre}</p>
      <p>当日の詳細はアプリ内チャットをご確認ください。</p>
    `,
  })

  return NextResponse.json({ sent: true })
}
