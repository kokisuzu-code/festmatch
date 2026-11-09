import EventOverview from '@/components/events/EventOverview'
import { findGenreSlotAvailability, getGenreSlotAvailability } from '@/lib/slots'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RegularSpacePlan from '@/components/regular-space-plan'
import { requireRole } from '@/lib/auth'
import { isApplicationClosed } from '@/lib/events'
import { getBoothBidding, boothMapUrl } from '@/lib/booth-bidding-server'
import BoothApplication from '@/components/bidding/BoothApplication'
import ApplyButton from '@/components/vendor/ApplyButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'イベント詳細・出店募集', description: '会場図と最高提示額を確認し、希望区画へ応募します。' }
export default async function VendorEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireRole('vendor')
  const { data: event } = await supabase.from('events').select('*').eq('id', id).eq('status', 'published').maybeSingle()
  if (!event) notFound()
  const { data: vendor } = await supabase.from('vendors').select('id, genre').eq('profile_id', user.id).maybeSingle()
  if (!vendor) return <section className="panel"><h1>出店者プロフィールを登録してください</h1><Link href="/vendor/settings">プロフィール設定へ</Link></section>
  const [bidding, { data: slots }] = await Promise.all([getBoothBidding(id, vendor.id), supabase.from('event_genre_slots').select('genre, capacity').eq('event_id', id)])
  const regularMap = !event.booth_bidding_enabled && boothMapUrl(event.booth_map_path)
  const { data: own } = await supabase.from('applications').select('id, status').eq('event_id', id).eq('vendor_id', vendor.id).maybeSingle()
  const planSpaces = regularMap ? bidding.spaces.map(space => ({
    id: space.id, label: space.label, genre: space.genre, map_x: space.map_x, map_y: space.map_y,
    occupancy: !space.assigned_application_id ? '空き' : space.assigned_application_id === own?.id ? '自店の区画' : '割当済み',
  })) : []
  const availability = await getGenreSlotAvailability([id])
  const matching = findGenreSlotAvailability(availability.get(id),vendor.genre)
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">EVENT DETAILS</p><h1>{event.title}</h1><p>イベントの紹介・主催者の要望・出店条件をご確認ください。</p></div><Link className="button button-secondary" href="/vendor/events">イベント一覧へ戻る</Link></section>
    <EventOverview event={event} slots={slots ?? []} />
    {regularMap && <RegularSpacePlan url={regularMap} spaces={planSpaces} />}
    {event.booth_bidding_enabled ? <BoothApplication eventId={id} mapUrl={boothMapUrl(event.booth_map_path)} spaces={bidding.spaces.map(({ assigned_application_id: _assignment, ...space }) => space)} maximums={bidding.maximums} mine={bidding.mine} genre={vendor.genre} slots={slots ?? []} deadline={event.application_deadline_at} finalizedAt={event.booth_bidding_finalized_at} /> : <section className="panel"><h2>出店応募</h2>{own ? <p>このイベントには応募済みです。<Link href="/vendor/applications">応募状況を確認する →</Link></p> : <ApplyButton eventId={id} closed={isApplicationClosed(event)} disabledReason={matching?.isFull ? `${matching.genre}枠は満了です。` : undefined} />}</section>}
  </div>
}
