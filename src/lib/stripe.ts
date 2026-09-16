import Stripe from "stripe"
import { VENDOR_PLANS, type VendorTier } from "@/lib/app"

let stripe: Stripe | null | undefined

export function getStripe() {
  if (stripe !== undefined) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  stripe = key ? new Stripe(key, { typescript: true }) : null
  return stripe
}

export function tierPriceId(tier: Exclude<VendorTier, "free">) {
  const priceId = process.env[`STRIPE_VENDOR_${tier.toUpperCase()}_PRICE_ID`]
  if (!priceId) throw new Error(`${VENDOR_PLANS[tier].label} プランのStripe Price IDが設定されていません。`)
  return priceId
}

export function organizerAnnualPriceId() {
  const priceId = process.env.STRIPE_ORGANIZER_ANNUAL_PRICE_ID
  if (!priceId) throw new Error("主催者年間契約のStripe Price IDが設定されていません。")
  return priceId
}

export function organizerSpotPriceId() {
  const priceId = process.env.STRIPE_ORGANIZER_SPOT_PRICE_ID
  if (!priceId) throw new Error("主催者スポット契約のStripe Price IDが設定されていません。")
  return priceId
}
