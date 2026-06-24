import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { application_id } = await req.json()

  const { data: app } = await supabase
    .from('applications')
    .select(`
      id, genre, decline_reason,
      events ( title, date ),
      vendors ( profiles ( name, email ) )
    `)
    .eq('id', application_id)
    .single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const vendorEmail = (app.vendors as any)?.profiles?.email
  const vendorName  = (app.vendors as any)?.profiles?.name
  const event       = app.events as any
  const reason = (app as any).decline_reason ?? '今回はジャンルの定員に達したため'

  await resend.emails.send({
    from: 'FestMatch <noreply@festmatch.jp>',
    to: vendorEmail,
    subject: `【ご連絡】${event.title} への出店について`,
    html: `
      <p>${vendorName} 様</p>
      <p>${event.title}（${event.date}）へのご応募ありがとうございました。</p>
      <p>${reason}、今回はご縁がありませんでした。</p>
      <p>またの機会にぜひご応募ください。</p>
    `,
  })

  return NextResponse.json({ sent: true })
}
