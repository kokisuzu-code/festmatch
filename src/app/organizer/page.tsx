import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { yen } from '@/lib/app'
import { formatEventDate, isEventEnded } from '@/lib/events'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '主催者ダッシュボード',
  description: '出店ベンダーの応募、審査、決済、連絡状況を管理するFestMatch主催者ダッシュボードです。',
}

export default async function OrganizerPage() {
  const { supabase, user, profile } = await requireRole('organizer')
  const { data: organizer } = await supabase
    .from('organizers')
    .select('id, organization_name, billing_plan, billing_status')
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: events } = organizer
    ? await supabase
        .from('events')
        .select('id, title, starts_at, ends_at, status, capacity')
        .eq('organizer_id', organizer.id)
        .order('starts_at', { ascending: true })
    : { data: [] }

  const eventIds = (events ?? []).map((event) => event.id)
  const { data: applications } = eventIds.length
    ? await supabase
        .from('applications')
        .select('id, event_id, vendor_id, status, created_at, vendor_genre_snapshot')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const vendorIds = [...new Set((applications ?? []).map((application) => application.vendor_id))]
  const { data: vendors } = vendorIds.length
    ? await supabase.from('vendors_public').select('id, name, genre').in('id', vendorIds)
    : { data: [] }
  const { data: spotContracts } = organizer
    ? await supabase
        .from('organizer_spot_contracts')
        .select('id')
        .eq('organizer_id', organizer.id)
        .eq('status', 'active')
        .gt('access_ends_at', new Date().toISOString())
    : { data: [] }

  const eventById = new Map((events ?? []).map((event) => [event.id, event]))
  const vendorById = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor]))
  const upcoming = (events ?? []).filter((event) => !isEventEnded(event))
  const activeApplications = (applications ?? []).filter((application) => application.status !== 'cancelled')
  const pending = activeApplications.filter((application) => application.status === 'pending')
  const approved = activeApplications.filter((application) => application.status === 'approved' || application.status === 'paid')
  const paid = activeApplications.filter((application) => application.status === 'paid')
  const uniqueVendorCount = new Set(activeApplications.map((application) => application.vendor_id)).size
  const hasAnnualPlan = organizer?.billing_plan === 'annual' && organizer.billing_status === 'active'
  const activeSpotCount = spotContracts?.length ?? 0
  const planName = hasAnnualPlan ? '年間契約' : activeSpotCount ? 'スポット契約' : '未契約'
  const planDetail = hasAnnualPlan
    ? `${yen(120000)}/月`
    : activeSpotCount
      ? `${activeSpotCount}イベント・${yen(250000)}/イベント（一括・最大3か月）`
      : `スポット ${yen(250000)}/イベント（一括・最大3か月）`

  return (
    <div className="dashboard-stack">
      <section className="dashboard-hero vendor-dashboard-hero">
        <div>
          <p className="eyebrow">VENDOR OPERATIONS</p>
          <h1>{organizer?.organization_name ?? profile?.display_name ?? '主催者'}</h1>
          <p>出店者の募集、審査、決済、当日までの連絡を一つの場所で管理します。</p>
        </div>
        <div className="button-row">
          <Link className="button button-secondary" href="/organizer/events/new">イベントを作成</Link>
          <Link className="button button-primary" href="/organizer/vendors">ベンダーを管理</Link>
        </div>
      </section>

      <section className="vendor-summary-grid" aria-label="ベンダー管理の状況">
        <Link className="vendor-summary-card" href="/organizer/vendors">
          <span>登録ベンダー</span>
          <strong>{uniqueVendorCount}</strong>
          <small>イベント横断の取引先</small>
        </Link>
        <Link className={`vendor-summary-card ${pending.length ? 'needs-action' : ''}`} href="/organizer/vendors?status=pending">
          <span>審査待ち</span>
          <strong>{pending.length}</strong>
          <small>{pending.length ? '対応が必要です' : '未対応はありません'}</small>
        </Link>
        <Link className="vendor-summary-card" href="/organizer/vendors?status=approved">
          <span>出店確定</span>
          <strong>{approved.length}</strong>
          <small>承認・決済済み</small>
        </Link>
        <Link className="vendor-summary-card" href="/organizer/vendors?status=paid">
          <span>決済完了</span>
          <strong>{paid.length}</strong>
          <small>当日準備へ進行可能</small>
        </Link>
      </section>

      <section className="vendor-dashboard-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACTION REQUIRED</p>
              <h2>対応が必要なベンダー</h2>
            </div>
            <Link href="/organizer/vendors?status=pending">すべて見る</Link>
          </div>
          {pending.length ? (
            <div className="vendor-compact-list">
              {pending.slice(0, 6).map((application) => {
                const vendor = vendorById.get(application.vendor_id)
                const event = eventById.get(application.event_id)
                return (
                  <Link
                    className="vendor-compact-row"
                    key={application.id}
                    href={`/organizer/events/${application.event_id}#application-${application.id}`}
                  >
                    <span className="vendor-avatar" aria-hidden="true">
                      {(vendor?.name ?? 'V').slice(0, 1)}
                    </span>
                    <span className="vendor-compact-copy">
                      <strong>{vendor?.name ?? 'ベンダー'}</strong>
                      <small>{application.vendor_genre_snapshot ?? vendor?.genre ?? 'ジャンル未設定'}・{event?.title ?? 'イベント'}</small>
                    </span>
                    <span className="vendor-date">{new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(new Date(application.created_at))}</span>
                    <span className="vendor-status vendor-status-pending">審査待ち</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="vendor-inline-empty">
              <strong>審査待ちの応募はありません</strong>
              <p>新しい応募が届くと、この一覧に表示されます。</p>
            </div>
          )}
        </div>

        <aside className="panel vendor-next-step">
          <p className="eyebrow">NEXT STEP</p>
          <h2>出店準備を前に進める</h2>
          <p>承認後は決済状況を確認し、イベント別チャットで搬入・区画・必要設備を共有できます。</p>
          <div className="vendor-next-actions">
            <Link href="/organizer/vendors?status=approved">承認済みを確認 <span>→</span></Link>
            <Link href="/organizer/events">イベント別に確認 <span>→</span></Link>
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EVENT COVERAGE</p>
            <h2>イベント別のベンダー状況</h2>
          </div>
          <Link href="/organizer/events">イベント管理</Link>
        </div>
        {upcoming.length ? (
          <div className="vendor-event-list">
            {upcoming.slice(0, 5).map((event) => {
              const eventApplications = activeApplications.filter((application) => application.event_id === event.id)
              const eventPending = eventApplications.filter((application) => application.status === 'pending').length
              const eventApproved = eventApplications.filter((application) => application.status === 'approved' || application.status === 'paid').length
              const fillRate = event.capacity ? Math.min(100, Math.round((eventApproved / event.capacity) * 100)) : 0
              return (
                <Link className="vendor-event-row" key={event.id} href={`/organizer/events/${event.id}`}>
                  <span className="vendor-event-title">
                    <strong>{event.title}</strong>
                    <small>{formatEventDate(event.starts_at)}・{event.status === 'published' ? '公開中' : '下書き'}</small>
                  </span>
                  <span className="vendor-event-stat"><small>応募</small><strong>{eventApplications.length}</strong></span>
                  <span className="vendor-event-stat"><small>審査待ち</small><strong className={eventPending ? 'attention' : ''}>{eventPending}</strong></span>
                  <span className="vendor-event-stat"><small>出店確定</small><strong>{eventApproved}</strong></span>
                  <span className="vendor-fill">
                    <small>充足率 {fillRate}%</small>
                    <i><b style={{ width: `${fillRate}%` }} /></i>
                  </span>
                  <span className="vendor-row-arrow" aria-hidden="true">→</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h3>開催予定のイベントはありません</h3>
            <p>イベントを作成して、出店ベンダーの募集を始めてください。</p>
            <Link className="button button-primary" href="/organizer/events/new">イベントを作成</Link>
          </div>
        )}
      </section>

      <section className="vendor-contract-strip" aria-label="現在の契約">
        <div>
          <span>現在の契約</span>
          <strong>{planName}</strong>
          <small>{planDetail}</small>
        </div>
        <Link href="/organizer/settings">契約内容を確認 →</Link>
      </section>
    </div>
  )
}
