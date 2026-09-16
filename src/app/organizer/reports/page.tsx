import { requireRole } from '@/lib/auth'
import { yen } from '@/lib/app'

export const dynamic = 'force-dynamic'
export const metadata = { title: '売上・実績', description: 'イベントと出店者の実績を集計します。' }

export default async function OrganizerReportsPage() {
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: events } = organizer ? await supabase.from('events').select('id, title, booth_fee_yen').eq('organizer_id', organizer.id) : { data: [] }
  const eventIds = (events ?? []).map((event) => event.id)
  const { data: applications } = eventIds.length ? await supabase.from('applications').select('event_id, status, booth_fee_yen_snapshot').in('event_id', eventIds) : { data: [] }
  const paid = (applications ?? []).filter((application) => application.status === 'paid')
  const revenue = paid.reduce((sum, application) => sum + Number(application.booth_fee_yen_snapshot ?? 0), 0)
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">SALES & PERFORMANCE</p><h1>売上・実績</h1><p>イベント横断で応募、出店確定、売上を確認できます。</p></div></section><section className="metrics-grid"><article className="metric-card"><div className="metric-top"><span>イベント数</span></div><strong>{events?.length ?? 0}</strong><p>登録済みイベント</p></article><article className="metric-card"><div className="metric-top"><span>応募数</span></div><strong>{applications?.length ?? 0}</strong><p>全イベント合計</p></article><article className="metric-card"><div className="metric-top"><span>決済完了</span></div><strong>{paid.length}</strong><p>出店確定ベンダー</p></article><article className="metric-card"><div className="metric-top"><span>売上</span></div><strong>{yen(revenue)}</strong><p>決済済み出店料</p></article></section></div>
}
