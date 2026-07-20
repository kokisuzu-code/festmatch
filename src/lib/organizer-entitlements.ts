import type { SupabaseClient } from '@supabase/supabase-js'

export async function hasEventPublicationEntitlement(
  supabase: SupabaseClient,
  organizerId: string,
  eventId: string,
) {
  const now = new Date().toISOString()
  const [{ data: organizer, error: organizerError }, { data: spot, error: spotError }] = await Promise.all([
    supabase
      .from('organizers')
      .select('billing_plan, billing_status')
      .eq('id', organizerId)
      .maybeSingle(),
    supabase
      .from('organizer_spot_contracts')
      .select('id')
      .eq('organizer_id', organizerId)
      .eq('event_id', eventId)
      .eq('status', 'active')
      .gt('access_ends_at', now)
      .maybeSingle(),
  ])

  if (organizerError || spotError) throw new Error('公開に必要な契約情報を確認できませんでした。')
  return (organizer?.billing_plan === 'annual' && organizer.billing_status === 'active') || Boolean(spot)
}
