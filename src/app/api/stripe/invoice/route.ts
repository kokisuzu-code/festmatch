import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] })
  }

  const invoices = await stripe.invoices.list({
    customer: profile.stripe_customer_id,
    limit: 12,
  })

  return NextResponse.json({
    invoices: invoices.data.map(inv => ({
      id:          inv.id,
      amount:      inv.amount_paid,
      status:      inv.status,
      created:     inv.created,
      invoice_pdf: inv.invoice_pdf,
      hosted_url:  inv.hosted_invoice_url,
    }))
  })
}
