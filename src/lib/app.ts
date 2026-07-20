export const APP_NAME = "FestMatch"

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const ORGANIZER_PLANS = {
  annual: { label: "年間契約", price: 120000, interval: "月" },
  spot: { label: "スポット契約", price: 250000, interval: "イベント", maximumMonths: 3 },
} as const

export const VENDOR_PLANS = {
  free: { label: "Free", price: 0, photoLimit: 3, feeDiscount: 0 },
  light: { label: "Light", price: 30000, photoLimit: 6, feeDiscount: 0.1 },
  standard: { label: "Standard", price: 80000, photoLimit: 10, feeDiscount: 0.3 },
  pro: { label: "Pro", price: 150000, photoLimit: 20, feeDiscount: 0.5 },
} as const

export type VendorTier = keyof typeof VENDOR_PLANS

export function yen(amount: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount)
}

export function paymentFeeAmount(feeAmount: number, tier: VendorTier) {
  return Math.round(feeAmount * 0.1 * (1 - VENDOR_PLANS[tier].feeDiscount))
}
