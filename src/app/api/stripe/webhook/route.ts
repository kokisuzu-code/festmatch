import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { updateVendorBilling } from '@/lib/stripe/vendor-billing'
import { updateOrganizerBilling } from '@/lib/stripe/organizer-billing'

export const runtime = 'nodejs'

function isSubscriptionActive(status: string) {
  return status === 'active' || status === 'trialing'
}

async function activateOrganizerSpotContract(admin: ReturnType<typeof createAdminClient>, session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {}
  if (metadata.kind !== 'organizer_spot' || !metadata.organizer_id || !metadata.event_id) return
  if (session.payment_status !== 'paid') return

  const { error } = await admin
    .from('organizer_spot_contracts')
    .update({
      status: 'active',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
      activated_at: new Date().toISOString(),
    })
    .eq('organizer_id', metadata.organizer_id)
    .eq('event_id', metadata.event_id)
    .eq('status', 'pending')
  if (error) throw error
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return NextResponse.json({ error: 'Stripe webhookが設定されていません。' }, { status: 503 })

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: '署名がありません。' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: '署名を検証できません。' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      const metadata = session.metadata ?? {}

      if (event.type === 'checkout.session.completed' && metadata.kind === 'application_payment' && metadata.application_id) {
        const { error } = await admin
          .from('applications')
          .update({
            status: 'paid',
            stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
          })
          .eq('id', metadata.application_id)
          .eq('status', 'approved')
        if (error) throw error
      }

      if (event.type === 'checkout.session.completed' && metadata.kind === 'vendor_subscription' && metadata.vendor_id && metadata.tier) {
        const { error } = await admin.from('vendors').update({ subscription_tier: metadata.tier }).eq('id', metadata.vendor_id)
        if (error) throw error
        await updateVendorBilling(metadata.vendor_id, {
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
          subscription_status: session.payment_status,
        })
      }

      if (event.type === 'checkout.session.completed' && metadata.kind === 'organizer_annual' && metadata.organizer_id) {
        await updateOrganizerBilling(metadata.organizer_id, {
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
          billing_plan: 'annual',
          billing_status: 'active',
        })
      }

      await activateOrganizerSpotContract(admin, session)
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const active = event.type !== 'customer.subscription.deleted' && isSubscriptionActive(subscription.status)
      const { data: vendorBilling } = await admin.from('vendor_billing').select('vendor_id').eq('stripe_subscription_id', subscription.id).maybeSingle()
      if (vendorBilling?.vendor_id) {
        const tier = active ? subscription.metadata.tier ?? 'free' : 'free'
        const { error } = await admin.from('vendors').update({ subscription_tier: tier }).eq('id', vendorBilling.vendor_id)
        if (error) throw error
        await updateVendorBilling(vendorBilling.vendor_id, {
          stripe_subscription_id: active ? subscription.id : null,
          subscription_status: subscription.status,
        })
      }

      const { data: organizer } = await admin.from('organizers').select('id').eq('stripe_subscription_id', subscription.id).maybeSingle()
      if (organizer?.id) {
        await updateOrganizerBilling(organizer.id, {
          stripe_subscription_id: active ? subscription.id : null,
          billing_status: subscription.status,
          billing_plan: 'annual',
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Webhookを処理できませんでした。' }, { status: 500 })
  }
}
