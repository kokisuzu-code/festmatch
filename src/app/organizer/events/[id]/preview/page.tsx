import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import EventOverview from '@/components/events/EventOverview'
import BoothMap from '@/components/bidding/BoothMap'
import { boothMapUrl, getBoothBidding } from '@/lib/booth-bidding-server'

export const dynamic = 'force-dynamic'
export default async function Preview({params}:{params:Promise<{id:string}>}) {
  const {id}=await params
  const {supabase,user}=await requireRole('organizer')
  const {data:organizer}=await supabase.from('organizers').select('id').eq('profile_id',user.id).maybeSingle()
  const {data:event}=organizer ? await supabase.from('events').select('*').eq('id',id).eq('organizer_id',organizer.id).maybeSingle() : {data:null}
  if (!event) notFound()
  const [bidding,{data:slots}]=await Promise.all([getBoothBidding(id),supabase.from('event_genre_slots').select('genre,capacity').eq('event_id',id)])
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">VENDOR PREVIEW</p><h1>出店者からの見え方</h1><p>保存済みの内容です。応募操作はできません。</p></div><Link className="button button-secondary" href={`/organizer/events/${id}/edit`}>編集に戻る</Link></section><EventOverview event={event} slots={slots ?? []} />{event.booth_map_path && <section className="panel"><h2>会場区画図</h2><BoothMap url={boothMapUrl(event.booth_map_path)} spaces={bidding.spaces} /><p>公開後、出店者はここから区画を確認できます。</p></section>}</div>
}
