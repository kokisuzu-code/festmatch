import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, organizerSpotPriceId } from '@/lib/stripe'
import { APP_URL, ORGANIZER_PLANS } from '@/lib/app'
import { getOrCreateOrganizerStripeCustomer, getOrganizerBilling } from '@/lib/stripe/organizer-billing'
import { createAdminClient } from '@/lib/supabase/admin'
import { isEventEnded } from '@/lib/events'

function spotAccessEnd() {
  const endsAt = new Date()
  endsAt.setMonth(endsAt.getMonth() + ORGANIZER_PLANS.spot.maximumMonths)
  return endsAt.toISOString()
}

export async function POST(request: Request) {
  let body: { event_id?: string }
  try { body = await request.json() as { event_id?: string } } catch { return NextResponse.json({ error: 'イベントを指定してください。' }, { status: 400 }) }
  const eventId = body.event_id
  if (!eventId || !/^[a-f0-9-]{36}$/i.test(eventId)) return NextResponse.json({ error: 'イベントを指定してください。' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })

  const { data: organizer } = await supabase.from('organizers').select('id, organization_name').eq('profile_id', user.id).maybeSingle()
  if (!organizer) return NextResponse.json({ error: '主催者プロフィールがありません。' }, { status: 403 })

  const { data: event } = await supabase
    .from('events')
    .select('id, ends_at')
    .eq('id', eventId)
    .eq('organizer_id', organizer.id)
    .maybeSingle()
  if (!event) return NextResponse.json({ error: 'このイベントのスポット契約を開始する権限がありません。' }, { status: 404 })
  if (isEventEnded(event)) return NextResponse.json({ error: '終了済みイベントにはスポット契約を利用できません。' }, { status: 409 })

  const accessEndsAt = spotAccessEnd()
  if (new Date(event.ends_at) > new Date(accessEndsAt)) {
    return NextResponse.json({ error: 'スポット契約は申込日から3か月以内に終了するイベントに利用できます。' }, { status: 409 })
  }

  const billing = await getOrganizerBilling(organizer.id)
  if (billing?.billing_plan === 'annual' && billing.billing_status === 'active') {
    return NextResponse.json({ error: '年間契約が有効なため、このイベントにスポット契約は必要ありません。' }, { status: 409 })
  }

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripeが設定されていません。' }, { status: 503 })

  const admin = createAdminClient()
  let pendingSaved = false
  let existing: {
    id: string
    status: string
    access_ends_at: string
    stripe_checkout_session_id: string | null
    stripe_payment_intent_id: string | null
    activated_at: string | null
  } | null = null

  try {
    const { data } = await admin
      .from('organizer_spot_contracts')
      .select('id, status, access_ends_at, stripe_checkout_session_id, stripe_payment_intent_id, activated_at')
      .eq('event_id', event.id)
      .maybeSingle()
    existing = data
    if (existing?.status === 'active' && new Date(existing.access_ends_at) > new Date()) {
      return NextResponse.json({ error: 'このイベントには有効なスポット契約があります。' }, { status: 409 })
    }
    if (existing?.status === 'pending') {
      return NextResponse.json({ error: 'このイベントの決済手続きが進行中です。Stripeの決済画面を確認してください。' }, { status: 409 })
    }

    const { error: pendingError } = await admin
      .from('organizer_spot_contracts')
      .upsert({
        event_id: event.id,
        organizer_id: organizer.id,
        amount_yen: ORGANIZER_PLANS.spot.price,
        status: 'pending',
        stripe_checkout_session_id: null,
        stripe_payment_intent_id: null,
        access_ends_at: accessEndsAt,
        activated_at: null,
      }, { onConflict: 'event_id' })
    if (pendingError) throw pendingError
    pendingSaved = true

    const customer = await getOrCreateOrganizerStripeCustomer({ organizerId: organizer.id, name: organizer.organization_name, email: user.email })
    const metadata = {
      kind: 'organizer_spot',
      organizer_id: organizer.id,
      event_id: event.id,
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer,
      line_items: [{ price: organizerSpotPriceId(), quantity: 1 }],
      success_url: `${APP_URL}/organizer/events/${event.id}?billing=spot-success`,
      cancel_url: `${APP_URL}/organizer/events/${event.id}?billing=cancelled`,
      metadata,
      payment_intent_data: { metadata },
    })
    if (!session.url) {
      if (existing) {
        await admin.from('organizer_spot_contracts').update({
          status: existing.status,
          access_ends_at: existing.access_ends_at,
          stripe_checkout_session_id: existing.stripe_checkout_session_id,
          stripe_payment_intent_id: existing.stripe_payment_intent_id,
          activated_at: existing.activated_at,
        }).eq('id', existing.id)
      } else {
        await admin.from('organizer_spot_contracts').delete().eq('event_id', event.id).eq('status', 'pending')
      }
      return NextResponse.json({ error: '決済ページを作成できませんでした。' }, { status: 502 })
    }
    const { error: sessionError } = await admin
      .from('organizer_spot_contracts')
      .update({ stripe_checkout_session_id: session.id })
      .eq('event_id', event.id)
      .eq('status', 'pending')
    if (sessionError) throw sessionError
    return NextResponse.json({ url: session.url })
  } catch (error) {
    if (pendingSaved) {
      if (existing) {
        await admin.from('organizer_spot_contracts').update({
          status: existing.status,
          access_ends_at: existing.access_ends_at,
          stripe_checkout_session_id: existing.stripe_checkout_session_id,
          stripe_payment_intent_id: existing.stripe_payment_intent_id,
          activated_at: existing.activated_at,
        }).eq('id', existing.id)
      } else {
        await admin.from('organizer_spot_contracts').delete().eq('event_id', event.id).eq('status', 'pending')
      }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'スポット契約を開始できませんでした。' }, { status: 400 })
  }
}
