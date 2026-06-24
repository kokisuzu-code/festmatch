import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const COST_LIMITS: Record<string, number> = {
  light: 10, standard: 30, pro: 999,
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 冪等性チェック
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    return NextResponse.json({ received: true })
  }

  await supabase.from('stripe_events').insert({ stripe_event_id: event.id })

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { user_id, plan_type } = session.metadata ?? {}

      if (user_id && session.subscription && plan_type) {
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)

        // スポットプランは3ヶ月で自動キャンセル
        if (plan_type === 'organizer_spot') {
          const cancelAt = new Date(stripeSub.current_period_start * 1000)
          cancelAt.setMonth(cancelAt.getMonth() + 3)
          await stripe.subscriptions.update(session.subscription as string, {
            cancel_at: Math.floor(cancelAt.getTime() / 1000),
          })
        }

        // profiles.stripe_customer_id を更新
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: session.customer as string })
          .eq('id', user_id)

        // subscriptions に登録（upsert で重複防止）
        await supabase.from('subscriptions').upsert({
          user_id,
          plan: plan_type,
          stripe_customer_id: session.customer as string,
          stripe_sub_id: session.subscription as string,
          status: 'active',
          cost_limit: COST_LIMITS[plan_type] ?? 10,
          cost_used: 0,
          period_start: new Date(stripeSub.current_period_start * 1000).toISOString().split('T')[0],
          period_end: new Date(stripeSub.current_period_end * 1000).toISOString().split('T')[0],
        }, { onConflict: 'user_id' })

        // profilesにもplan・stripe_customer_idを反映
        await supabase.from('profiles')
          .update({ plan: plan_type, stripe_customer_id: session.customer as string })
          .eq('id', user_id)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            period_start: new Date(sub.current_period_start * 1000).toISOString().split('T')[0],
            period_end: new Date(sub.current_period_end * 1000).toISOString().split('T')[0],
          })
          .eq('stripe_sub_id', invoice.subscription)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.subscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_sub_id', invoice.subscription)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_sub_id', sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
