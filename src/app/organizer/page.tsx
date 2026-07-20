import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { yen } from '@/lib/app'
import { isEventEnded } from '@/lib/events'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '主催者ダッシュボード',
  description: 'イベント運営と応募管理を行うFestMatch主催者ダッシュボードです。',
}

export default async function OrganizerPage() {
  const { supabase, user, profile } = await requireRole('organizer')
  const { data: organizer } = await supabase
    .from('organizers')
    .select('id, organization_name, billing_plan, billing_status')
    .eq('profile_id', user.id)
    .maybeSingle()
  const [{ data: events }, { data: spotContracts }] = await Promise.all([
    organizer
      ? supabase.from('events').select('id, title, starts_at, ends_at, status, booth_fee_yen').eq('organizer_id', organizer.id).order('starts_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    organizer
      ? supabase.from('organizer_spot_contracts').select('id').eq('organizer_id', organizer.id).eq('status', 'active').gt('access_ends_at', new Date().toISOString())
      : Promise.resolve({ data: [] }),
  ])

  const upcoming = (events ?? []).filter((event) => !isEventEnded(event))
  const archivedCount = (events ?? []).length - upcoming.length
  const hasAnnualPlan = organizer?.billing_plan === 'annual' && organizer.billing_status === 'active'
  const activeSpotCount = spotContracts?.length ?? 0
  const planName = hasAnnualPlan ? '年間契約' : activeSpotCount ? 'スポット契約' : '未契約'
  const planDetail = hasAnnualPlan
    ? `${yen(120000)}/月`
    : activeSpotCount
      ? `${activeSpotCount}イベント・${yen(250000)}/イベント（一括・最大3か月）`
      : `スポット ${yen(250000)}/イベント（一括・最大3か月）`

  return <div className="dashboard-stack">
    <section className="dashboard-hero">
      <div><p className="eyebrow">主催者ダッシュボード</p><h1>{organizer?.organization_name ?? profile?.display_name ?? '主催者'}</h1><p>募集、応募、決済の状況を一つの場所で管理できます。</p></div>
      <Link className="button button-primary" href="/organizer/events/new">イベントを作成</Link>
    </section>
    <section className="metric-grid" aria-label="イベントの状況">
      <div className="metric-card"><span>開催予定</span><strong>{upcoming.length}</strong><small>公開・下書きを含む</small></div>
      <div className="metric-card"><span>過去の開催実績</span><strong>{archivedCount}</strong><small>終了日時から自動集計</small></div>
      <div className="metric-card"><span>契約プラン</span><strong>{planName}</strong><small>{planDetail}</small></div>
    </section>
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">イベント</p><h2>直近のイベント</h2></div><Link href="/organizer/events">すべて見る</Link></div>
      {upcoming.length ? <div className="event-list">{upcoming.slice(0, 5).map((event) => <Link className="event-row" key={event.id} href={`/organizer/events/${event.id}`}><div><strong>{event.title}</strong><span>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.starts_at))}</span></div><div><span className={event.status === 'published' ? 'status status-published' : 'status'}>{event.status === 'published' ? '公開中' : '下書き'}</span><span>{yen(event.booth_fee_yen ?? 0)}</span></div></Link>)}</div> : <div className="empty-state"><h3>イベントはまだありません</h3><p>まずは出店を募集するイベントを作成してください。</p><Link className="button button-primary" href="/organizer/events/new">最初のイベントを作成</Link></div>}
    </section>
  </div>
}
