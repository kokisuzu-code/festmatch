import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_MAP: Record<string, string> = {
  organizer_annual: process.env.STRIPE_PRICE_ORGANIZER_ANNUAL!,
  organizer_spot: process.env.STRIPE_PRICE_ORGANIZER_SPOT!,
  vendor_light: process.env.STRIPE_PRICE_VENDOR_LIGHT!,
  vendor_standard: process.env.STRIPE_PRICE_VENDOR_STANDARD!,
  vendor_pro: process.env.STRIPE_PRICE_VENDOR_PRO!,
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { plan_type, user_id, event_id } = body

  const price_id = PRICE_MAP[plan_type]
  if (!price_id) {
    return NextResponse.json({ error: 'Invalid plan_type' }, { status: 400 })
  }

  const base_url = process.env.NEXT_PUBLIC_BASE_URL!

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${base_url}/dashboard?checkout=success`,
      cancel_url: `${base_url}/dashboard?checkout=cancel`,
      metadata: {
        user_id,
        plan_type,
        ...(event_id ? { event_id } : {}),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/checkout]', error)
    return NextResponse.json({ error: 'Stripe API error' }, { status: 500 })
  }
}
