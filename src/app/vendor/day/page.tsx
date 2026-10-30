import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import VendorDayOperations from './VendorDayOperations'
import { formatEventDate, isEventEnded } from '@/lib/events'

export const dynamic = 'force-dynamic'
export const metadata = { title: '当日の準備・連絡' }

export default async function VendorDayPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { supabase, user } = await requireRole('vendor')
  const { event } = await searchParams
  const { data: vendor, error: vendorError } = await supabase.from('vendors').select('id').eq('profile_id', user.id).maybeSingle()
  if (vendorError) throw new Error('ベンダー情報を読み込めませんでした。')
  const { data: applications, error } = vendor ? await supabase.from('applications').select('event_id,events(id,title,starts_at,ends_at)').eq('vendor_id', vendor.id).in('status', ['approved', 'paid']) : { data: [], error: null }
  if (error) throw new Error('出店予定を読み込めませんでした。')
  const events = (applications ?? []).map(app => app.events as unknown as { id: string; title: string; starts_at: string; ends_at: string } | null).filter((row): row is NonNullable<typeof row> => Boolean(row)).sort((a,b) => a.starts_at.localeCompare(b.starts_at))
  const selected = events.find(item => item.id === event) ?? events.find(item => !isEventEnded(item)) ?? events.at(-1)
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">EVENT DAY</p><h1>当日の準備・連絡</h1><p>到着状況の報告、自己確認、主催者からのお知らせを確認できます。</p></div><Link className="button button-secondary" href="/vendor/applications">応募状況</Link></section>{events.length ? <><nav className="button-row" aria-label="出店イベント">{events.map(item => <Link className={`button ${item.id === selected?.id ? 'button-primary' : 'button-secondary'}`} key={item.id} href={`/vendor/day?event=${item.id}`}>{item.title} ・ {formatEventDate(item.starts_at)}</Link>)}</nav>{selected && <VendorDayOperations key={selected.id} eventId={selected.id} />}</> : <section className="panel empty-state"><h2>承認済みのイベントはまだありません</h2><p>応募が承認されると、当日の準備を始められます。</p><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></section>}</div>
}
