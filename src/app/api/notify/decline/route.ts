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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'organizer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { application_id, vendor_email, vendor_name, event_name, reason } = await request.json()
  const declineReason = reason ?? '今回は選考の結果、ご期待に添えない結果となりました。'

  const admin = createAdminClient()

  await admin
    .from('applications')
    .update({ status: 'declined' })
    .eq('id', application_id)

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: vendor_email,
    subject: `【FestMatch】出店申請の結果について — ${event_name}`,
    html: `
      <p>${vendor_name} 様</p>
      <p>${event_name} への出店申請について、誠に恐れ入りますが今回はご参加いただけない結果となりました。</p>
      <p>理由: ${declineReason}</p>
      <p>またの機会にぜひご応募ください。</p>
    `,
  })

  if (error) {
    console.error('[notify/decline] resend error', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message_id: data?.id })
}
