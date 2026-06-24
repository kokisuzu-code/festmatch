import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id, body, attachment_url, attachment_type } = await req.json()

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, title')
    .eq('id', event_id)
    .single()

  if (!event || event.organizer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: message } = await supabaseAdmin
    .from('messages')
    .insert({
      application_id: null,
      sender_id: user.id,
      body,
      is_broadcast: true,
      attachment_url: attachment_url ?? null,
      attachment_type: attachment_type ?? null,
    })
    .select().single()

  const { data: apps } = await supabaseAdmin
    .from('applications')
    .select('vendors ( profiles ( name, email ) )')
    .eq('event_id', event_id)
    .eq('status', 'approved')

  const recipients = apps?.map((a: any) => ({
    name:  a.vendors?.profiles?.name,
    email: a.vendors?.profiles?.email,
  })).filter((r: any) => r.email) ?? []

  for (const r of recipients) {
    await resend.emails.send({
      from: 'FestMatch <noreply@festmatch.jp>',
      to: r.email,
      subject: `【全体連絡】${event.title}`,
      html: `
        <p>${r.name} 様</p>
        <p>${body}</p>
        ${attachment_url ? `<p><a href="${attachment_url}">添付ファイルを確認する</a></p>` : ''}
        <p>アプリ内でいいねボタンを押して確認済みをお知らせください。</p>
      `,
    })
  }

  return NextResponse.json({ sent: recipients.length, message_id: message?.id })
}
