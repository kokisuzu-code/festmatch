import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { formatEventDate, isApplicationClosed } from '@/lib/events'
import { getBoothBidding, boothMapUrl } from '@/lib/booth-bidding-server'
import BoothApplication from '@/components/bidding/BoothApplication'
import ApplyButton from '@/components/vendor/ApplyButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: '区画を選んで応募', description: '会場図と最高提示額を確認し、希望区画へ応募します。' }
export default async function VendorEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireRole('vendor')
  const { data: event } = await supabase.from('events').select('*').eq('id', id).eq('status', 'published').maybeSingle()
  if (!event) notFound()
  const { data: vendor } = await supabase.from('vendors').select('id, genre').eq('profile_id', user.id).maybeSingle()
  if (!vendor) return <section className="panel"><h1>出店者プロフィールを登録してください</h1><Link href="/vendor/settings">プロフィール設定へ</Link></section>
  const [bidding, { data: slots }] = await Promise.all([getBoothBidding(id, vendor.id), supabase.from('event_genre_slots').select('genre, capacity').eq('event_id', id)])
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">BOOTH APPLICATION</p><h1>{event.title}</h1><p>{formatEventDate(event.starts_at)} ・ {event.address ?? event.prefecture}</p><p>{event.description}</p></div><Link className="button button-secondary" href="/vendor/events">イベント一覧へ戻る</Link></section>{event.booth_bidding_enabled ? <BoothApplication eventId={id} mapUrl={boothMapUrl(event.booth_map_path)} spaces={bidding.spaces.map(({ assigned_application_id: _assignment, ...space }) => space)} maximums={bidding.maximums} mine={bidding.mine} genre={vendor.genre} slots={slots ?? []} deadline={event.application_deadline_at} finalizedAt={event.booth_bidding_finalized_at} /> : <section className="panel"><ApplyButton eventId={id} closed={isApplicationClosed(event)} /></section>}</div>
}
