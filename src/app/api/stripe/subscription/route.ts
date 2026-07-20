import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe, tierPriceId } from "@/lib/stripe"
import { APP_URL, type VendorTier } from "@/lib/app"
import { getOrCreateStripeCustomer } from "@/lib/stripe/vendor-billing"

export async function POST(request: Request) {
  const { tier } = await request.json() as { tier?: VendorTier }
  if (tier !== "light" && tier !== "standard" && tier !== "pro") return NextResponse.json({ error: "プランを選択してください。" }, { status: 400 })
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 })
  const { data: vendor } = await supabase.from("vendors").select("id, name").eq("profile_id", user.id).maybeSingle()
  if (!vendor) return NextResponse.json({ error: "ベンダープロフィールがありません。" }, { status: 403 })
  const stripe = getStripe(); if (!stripe) return NextResponse.json({ error: "Stripeが設定されていません。" }, { status: 503 })
  let customerId: string
  try { customerId = await getOrCreateStripeCustomer({ vendorId: vendor.id, name: vendor.name, email: user.email }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe顧客情報を準備できません。" }, { status: 503 }) }
  try {
    const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: customerId, success_url: `${APP_URL}/vendor/settings?subscription=success`, cancel_url: `${APP_URL}/vendor/settings?subscription=cancelled`, line_items: [{ price: tierPriceId(tier), quantity: 1 }], metadata: { kind: "vendor_subscription", vendor_id: vendor.id, tier }, subscription_data: { metadata: { vendor_id: vendor.id, tier } } })
    return NextResponse.json({ url: session.url })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "サブスクリプションを開始できません。" }, { status: 400 }) }
}
