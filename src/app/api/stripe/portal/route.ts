import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { APP_URL } from "@/lib/app"
import { getVendorBilling } from "@/lib/stripe/vendor-billing"

export async function POST() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 })
  const { data: vendor } = await supabase.from("vendors").select("id").eq("profile_id", user.id).maybeSingle()
  if (!vendor) return NextResponse.json({ error: "ベンダープロフィールがありません。" }, { status: 403 })
  const billing = await getVendorBilling(vendor.id)
  if (!billing?.stripe_customer_id) return NextResponse.json({ error: "有効なStripe顧客情報がありません。" }, { status: 409 })
  const stripe = getStripe(); if (!stripe) return NextResponse.json({ error: "Stripeが設定されていません。" }, { status: 503 })
  const session = await stripe.billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: `${APP_URL}/vendor/settings` })
  return NextResponse.json({ url: session.url })
}
