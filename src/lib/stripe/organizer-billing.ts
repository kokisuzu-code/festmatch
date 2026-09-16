import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

// The remote schema keeps organizer billing fields on `organizers`; do not
// introduce a second billing table in application code.
export async function getOrganizerBilling(organizerId: string) {
  const { data, error } = await createAdminClient()
    .from('organizers')
    .select('stripe_customer_id, stripe_subscription_id, billing_plan, billing_status')
    .eq('id', organizerId)
    .maybeSingle()

  if (error) throw new Error('主催者の請求情報を取得できませんでした。')
  return data
}

export async function getOrCreateOrganizerStripeCustomer({ organizerId, name, email }: { organizerId: string; name: string; email?: string | null }) {
  const billing = await getOrganizerBilling(organizerId)
  if (billing?.stripe_customer_id) return billing.stripe_customer_id

  const stripe = getStripe()
  if (!stripe) throw new Error('Stripeが設定されていません。')
  const customer = await stripe.customers.create({
    name,
    email: email ?? undefined,
    metadata: { organizer_id: organizerId },
  })
  const { error } = await createAdminClient()
    .from('organizers')
    .update({ stripe_customer_id: customer.id })
    .eq('id', organizerId)
  if (error) throw new Error('Stripe顧客情報を保存できませんでした。')
  return customer.id
}

export async function updateOrganizerBilling(organizerId: string, values: Record<string, string | null>) {
  const { error } = await createAdminClient().from('organizers').update(values).eq('id', organizerId)
  if (error) throw new Error('主催者の請求情報を更新できませんでした。')
}
