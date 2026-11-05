import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { boothMaximums, type BoothBid, type BoothSpace } from '@/lib/booth-bidding'

export async function getBoothBidding(eventId: string, vendorId?: string) {
  const admin = createAdminClient()
  const [{ data: spaces, error: se }, { data: bids, error: be }] = await Promise.all([
    admin.from('event_spaces').select('id, label, genre, minimum_fee_yen, map_x, map_y, assigned_application_id').eq('event_id', eventId).order('label'),
    admin.from('booth_bids').select('id, vendor_id, genre, amount_yen, amount_submitted_at, preferences, message, status, version, application_id').eq('event_id', eventId),
  ])
  if (se || be) throw new Error('区画応募の情報を読み込めませんでした。')
  const allBids = (bids ?? []) as BoothBid[]
  return { spaces: (spaces ?? []) as BoothSpace[], maximums: boothMaximums(allBids, (spaces ?? []) as BoothSpace[]), mine: allBids.find(bid => bid.vendor_id === vendorId) ?? null, bids: allBids }
}
export function boothMapUrl(path: string | null) {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${path.split('/').map(encodeURIComponent).join('/')}`
}
