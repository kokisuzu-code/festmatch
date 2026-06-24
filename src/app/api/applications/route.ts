import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const PAY_PER_APPLY_PRICES: Record<string, number> = {
  S: 10000, A: 5000, B: 3000, C: 1000,
}

function calcTier(visitors: number, fee: number): { tier: string; costWeight: number } {
  const byVisitors =
    visitors >= 10000 ? { tier: 'S', costWeight: 10 } :
    visitors >= 3000  ? { tier: 'A', costWeight: 5  } :
    visitors >= 1000  ? { tier: 'B', costWeight: 3  } :
                        { tier: 'C', costWeight: 1  }
  const byFee =
    fee >= 50000 ? { tier: 'S', costWeight: 10 } :
    fee >= 30000 ? { tier: 'A', costWeight: 5  } :
    fee >= 20000 ? { tier: 'B', costWeight: 3  } :
                   { tier: 'C', costWeight: 1  }
  return byVisitors.costWeight >= byFee.costWeight ? byVisitors : byFee
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id, vendor_id, genre } = await req.json()

  // イベント情報からティア・コスト重みを計算
  const { data: event } = await supabase
    .from('events')
    .select('expected_visitors, fee, cost_weight, tier')
    .eq('id', event_id)
    .single()
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { tier, costWeight } = calcTier(event.expected_visitors ?? 0, event.fee ?? 0)

  // タイムセール後のコスト重みを確認
  const { data: slot } = await supabase
    .from('event_genre_slots')
    .select('max_count, approved_count, current_cost_weight, discount_active')
    .eq('event_id', event_id)
    .eq('genre', genre)
    .single()

  const effectiveCost = slot?.discount_active && slot?.current_cost_weight
    ? slot.current_cost_weight : costWeight

  // サブスクの状態を確認
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('cost_limit, cost_used, carry_over_cost, status, plan')
    .eq('user_id', user.id)
    .single()

  const isSubscriber   = sub?.status === 'active' && sub?.plan !== 'free'
  const totalAvailable = (sub?.cost_limit ?? 0) - (sub?.cost_used ?? 0) + (sub?.carry_over_cost ?? 0)
  const hasEnoughCost  = isSubscriber && totalAvailable >= effectiveCost
  const isWaitlist     = slot ? slot.approved_count >= slot.max_count : false

  // サブスク加入者かつコスト十分：コスト消費で応募
  if (hasEnoughCost) {
    const { data: application, error } = await supabase
      .from('applications')
      .insert({ event_id, vendor_id, genre, status: 'pending', is_waitlist: isWaitlist, charge_type: 'subscription' })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // 繰り越し分から先に消費
    const carryOver = sub?.carry_over_cost ?? 0
    const used      = sub?.cost_used ?? 0
    if (carryOver >= effectiveCost) {
      await supabase.from('subscriptions').update({ carry_over_cost: carryOver - effectiveCost }).eq('user_id', user.id)
    } else {
      await supabase.from('subscriptions').update({ carry_over_cost: 0, cost_used: used + (effectiveCost - carryOver) }).eq('user_id', user.id)
    }
    return NextResponse.json({ application, charge_type: 'subscription', cost_consumed: effectiveCost })
  }

  // 無料ユーザー or コスト不足：従量課金で応募
  const payPerApplyAmount = PAY_PER_APPLY_PRICES[tier] ?? 1000

  const { data: profile } = await supabase
    .from('profiles').select('stripe_customer_id').eq('id', user.id).single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'カード情報が登録されていません。先にお支払い方法を登録してください。' },
      { status: 400 }
    )
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: payPerApplyAmount,
    currency: 'jpy',
    customer: profile.stripe_customer_id,
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { event_id, vendor_id, genre, tier, charge_type: 'pay_per_apply' },
  })

  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      event_id, vendor_id, genre, status: 'pending', is_waitlist: isWaitlist,
      charge_type: 'pay_per_apply',
      pay_per_apply_amount: payPerApplyAmount,
      stripe_payment_intent_id: paymentIntent.id,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ application, charge_type: 'pay_per_apply', amount: payPerApplyAmount, tier })
}
