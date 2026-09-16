import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { eventStateLabel, formatEventDate, isEventEnded } from '@/lib/events'
import { yen } from '@/lib/app'
import ApplicationDecision from '@/components/organizer/ApplicationDecision'
import EmbedCode from '@/components/organizer/EmbedCode'
import PublishEventButton from '@/components/organizer/PublishEventButton'
import SpotEventCheckoutButton from '@/components/organizer/SpotEventCheckoutButton'
import { acceptedApplicationStatuses } from '@/lib/slots'
import { hasEventPublicationEntitlement } from '@/lib/organizer-entitlements'

export const dynamic = 'force-dynamic'

export default async function OrganizerEventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireRole('organizer')
  const { data: event } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
  if (!event) notFound()
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const canPublish = organizer ? await hasEventPublicationEntitlement(supabase, organizer.id, event.id) : false

  const { data: applications } = await supabase
    .from('applications')
    .select('id, vendor_id, status, message, created_at, vendor_genre_snapshot')
    .eq('event_id', id)
    .order('created_at', { ascending: false })
  const vendorIds = (applications ?? []).map((application) => application.vendor_id)
  const { data: vendors } = vendorIds.length
    ? await supabase.from('vendors_public').select('id, name, genre').in('id', vendorIds)
    : { data: [] }
  const vendorById = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor]))
  const [{ data: genreSlots }, { data: spaces }] = await Promise.all([
    supabase.from('event_genre_slots').select('id, genre, capacity').eq('event_id', id).order('genre'),
    supabase.from('event_spaces').select('id, label, genre, assigned_application_id').eq('event_id', id).order('label'),
  ])
  const approvedByGenre = new Map<string, number>()
  for (const application of applications ?? []) {
    if (!acceptedApplicationStatuses.includes(application.status as (typeof acceptedApplicationStatuses)[number])) continue
    const genre = application.vendor_genre_snapshot ?? vendorById.get(application.vendor_id)?.genre
    if (genre) approvedByGenre.set(genre, (approvedByGenre.get(genre) ?? 0) + 1)
  }
  const genreSlotByGenre = new Map((genreSlots ?? []).map((slot) => [slot.genre, slot]))
  const spaceByApplicationId = new Map((spaces ?? []).flatMap((space) => space.assigned_application_id ? [[space.assigned_application_id, space] as const] : []))
  const ended = isEventEnded(event)
  const { data: aggregates } = await supabase
    .from('sales_aggregate_by_genre')
    .select('genre, vendor_count, total_amount, avg_amount')
    .eq('event_id', id)

  return (
    <div className="dashboard-stack">
      <section className="dashboard-hero">
        <div><p className="eyebrow">EVENT OVERVIEW</p><h1>{event.title}</h1><p>{formatEventDate(event.starts_at)} から {formatEventDate(event.ends_at)}</p></div>
        <div className="button-row"><Link className="button button-secondary" href={`/organizer/events/${id}/edit`}>編集</Link><Link className="button button-primary" href={`/organizer/events/${id}/chat`}>チャット</Link></div>
      </section>
      <section className="metric-grid">
        <div className="metric-card"><span>公開状態</span><strong>{event.status === 'published' ? '公開中' : '下書き'}</strong><small>{eventStateLabel(event)}</small></div>
        <div className="metric-card"><span>応募数</span><strong>{applications?.length ?? 0}</strong><small>募集枠 {event.capacity ?? '未設定'}</small></div>
        <div className="metric-card"><span>出店料</span><strong>{yen(event.booth_fee_yen ?? 0)}</strong><small>決済時は10%の手数料を控除</small></div>
      </section>
      {event.status !== 'published' && !ended && (
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">PUBLICATION</p><h2>募集を公開する</h2></div></div>
          {canPublish ? <><p className="panel-copy">このイベントの公開条件を満たしています。公開後、ベンダーがFestMapから応募できるようになります。</p><div className="button-row"><PublishEventButton eventId={event.id} /></div></> : <><p className="panel-copy">年間契約ならすべてのイベントを公開できます。スポット契約は、このイベントごとに ¥250,000 を一括決済し、利用期間は決済日から最大3か月です。</p><div className="button-row"><SpotEventCheckoutButton eventId={event.id} /><Link className="button button-secondary" href="/organizer/settings">年間契約を確認する</Link></div></>}
        </section>
      )}
      {event.status === 'published' && !ended && <section className="panel"><div className="section-heading"><div><p className="eyebrow">EMBED WIDGET</p><h2>公開応募フォーム</h2></div></div><EmbedCode slug={event.slug} /></section>}
      {(genreSlots?.length || spaces?.length) ? <section className="panel"><div className="section-heading"><div><p className="eyebrow">CAPACITY</p><h2>枠・区画の状況</h2></div><Link href={`/organizer/events/${id}/edit`}>編集</Link></div>{genreSlots?.length ? <div className="aggregate-grid">{genreSlots.map((slot) => { const used = approvedByGenre.get(slot.genre) ?? 0; const full = used >= slot.capacity; return <div className="metric-card" key={slot.id}><span>{slot.genre}</span><strong>{used} / {slot.capacity}</strong><small>{full ? '枠満了' : `残り ${slot.capacity - used} 枠`}</small></div> })}</div> : null}{spaces?.length ? <div className="event-list space-list">{spaces.map((space) => <div className="event-row" key={space.id}><div><strong>{space.label}</strong><span>{space.genre ? `${space.genre}向け` : 'ジャンル指定なし'}</span></div><span className="status">{space.assigned_application_id ? '割当済み' : '空き'}</span></div>)}</div> : null}</section> : null}
      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">APPLICATIONS</p><h2>応募管理</h2></div><span className="status">{ended ? '開催終了' : eventStateLabel(event)}</span></div>
        {applications?.length ? <div className="application-list">{applications.map((application) => {
          const vendor = vendorById.get(application.vendor_id)
          const genre = application.vendor_genre_snapshot ?? vendor?.genre ?? null
          const slot = genre ? genreSlotByGenre.get(genre) : undefined
          const genreSlotFull = application.status === 'pending' && Boolean(slot && (approvedByGenre.get(slot.genre) ?? 0) >= slot.capacity)
          const assignedSpace = spaceByApplicationId.get(application.id)
          return <article className="application-card" id={`application-${application.id}`} key={application.id}><div><strong>{vendor?.name ?? 'ベンダー'}</strong><span>{genre ?? 'ジャンル未設定'} ・ {new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(application.created_at))}</span>{assignedSpace && <span>割当区画: {assignedSpace.label}</span>}{genreSlotFull && <span className="slot-full-note">{slot?.genre}枠は満了</span>}{application.message && <p>{application.message}</p>}</div>{ended ? <span className="status">{application.status}</span> : <ApplicationDecision eventId={id} applicationId={application.id} status={application.status} vendorGenre={genre} spaces={spaces ?? []} assignedSpaceId={assignedSpace?.id ?? null} genreSlotFull={genreSlotFull} />}</article>
        })}</div> : <div className="empty-state"><h3>応募はまだありません</h3><p>公開イベントはベンダーの検索画面に表示されます。</p></div>}
      </section>
      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">ANONYMIZED INSIGHTS</p><h2>ジャンル別統計</h2></div></div>
        {aggregates?.length ? <div className="aggregate-grid">{aggregates.map((aggregate) => <div className="metric-card" key={aggregate.genre}><span>{aggregate.genre}</span><strong>{yen(aggregate.avg_amount ?? 0)}</strong><small>{aggregate.vendor_count}社以上の匿名平均</small></div>)}</div> : <div className="empty-state"><p>3社以上の記録があるジャンルだけを匿名集計で表示します。</p></div>}
      </section>
    </div>
  )
}
