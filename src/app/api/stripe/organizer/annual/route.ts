import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, organizerAnnualPriceId } from '@/lib/stripe'
import { APP_URL } from '@/lib/app'
import { getOrCreateOrganizerStripeCustomer, getOrganizerBilling } from '@/lib/stripe/organizer-billing'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })

  const { data: organizer } = await supabase
    .from('organizers')
    .select('id, organization_name')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!organizer) return NextResponse.json({ error: '主催者プロフィールがありません。' }, { status: 403 })

  const billing = await getOrganizerBilling(organizer.id)
  if (billing?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(billing.billing_status ?? '')) {
    return NextResponse.json({ error: 'すでに有効な主催者契約があります。' }, { status: 409 })
  }

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripeが設定されていません。' }, { status: 503 })

  try {
    const customer = await getOrCreateOrganizerStripeCustomer({ organizerId: organizer.id, name: organizer.organization_name, email: user.email })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price: organizerAnnualPriceId(), quantity: 1 }],
      success_url: `${APP_URL}/organizer/settings?billing=annual-success`,
      cancel_url: `${APP_URL}/organizer/settings?billing=cancelled`,
      metadata: { kind: 'organizer_annual', organizer_id: organizer.id },
      subscription_data: { metadata: { kind: 'organizer_annual', organizer_id: organizer.id } },
    })
    if (!session.url) return NextResponse.json({ error: '決済ページを作成できませんでした。' }, { status: 502 })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '年間契約を開始できませんでした。' }, { status: 400 })
  }
}
