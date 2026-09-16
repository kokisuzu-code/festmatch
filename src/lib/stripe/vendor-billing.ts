import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

export async function getVendorBilling(vendorId: string) {
  const { data, error } = await createAdminClient()
    .from('vendor_billing')
    .select('stripe_customer_id, stripe_subscription_id, stripe_connect_account_id, subscription_status')
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (error) throw new Error('ベンダーの請求情報を取得できませんでした。')
  return data
}

export async function getOrCreateStripeCustomer({ vendorId, name, email }: { vendorId: string; name: string; email?: string | null }) {
  const admin = createAdminClient()
  const billing = await getVendorBilling(vendorId)
  if (billing?.stripe_customer_id) return billing.stripe_customer_id

  const stripe = getStripe()
  if (!stripe) throw new Error('Stripeが設定されていません。')

  const customer = await stripe.customers.create({
    name,
    email: email ?? undefined,
    metadata: { vendor_id: vendorId },
  })
  const { error } = await admin.from('vendor_billing').upsert({
    vendor_id: vendorId,
    stripe_customer_id: customer.id,
  }, { onConflict: 'vendor_id' })

  if (error) throw new Error('Stripe顧客情報を保存できませんでした。')
  return customer.id
}

export async function updateVendorBilling(vendorId: string, values: Record<string, string | boolean | null>) {
  const { error } = await createAdminClient()
    .from('vendor_billing')
    .upsert({ vendor_id: vendorId, ...values }, { onConflict: 'vendor_id' })

  if (error) throw new Error('ベンダーの請求情報を更新できませんでした。')
}
