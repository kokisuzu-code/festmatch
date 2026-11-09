import { applicationStatusLabel } from '@/lib/application-status'
import Link from "next/link"
import { yen } from "@/lib/app"
import { requireRole } from "@/lib/auth"
import { formatEventDate, isEventEnded } from "@/lib/events"
import CheckoutButton from "@/components/vendor/CheckoutButton"

export const dynamic = "force-dynamic"
export const metadata = { title: "応募状況", description: "FestMatchで送信した応募の状況を確認できます。" }

export default async function VendorApplicationsPage() {
  const { supabase, user } = await requireRole("vendor")
  const { data: vendor } = await supabase.from("vendors").select("id").eq("profile_id", user.id).maybeSingle()
  const { data: applications } = vendor ? await supabase.from("applications").select("id, event_id, status, message, created_at, booth_bid_id, booth_fee_yen_snapshot, events(title, starts_at, ends_at, prefecture, booth_fee_yen, booth_map_path)").eq("vendor_id", vendor.id).order("created_at", { ascending: false }) : { data: [] }
  const { data: bids } = vendor ? await supabase.from('booth_bids').select('id, event_id, status, amount_yen, amount_submitted_at, genre, events(title)').eq('vendor_id', vendor.id).neq('status', 'awarded').order('created_at', { ascending: false }) : { data: [] }
  const applicationIds = (applications ?? []).map((application) => application.id)
  const { data: spaces } = applicationIds.length
    ? await supabase.from('event_spaces').select('label, assigned_application_id').in('assigned_application_id', applicationIds)
    : { data: [] }
  const spaceByApplicationId = new Map((spaces ?? []).flatMap((space) => space.assigned_application_id ? [[space.assigned_application_id, space] as const] : []))
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><h1>応募状況</h1><p>承認後は割当区画と確定した出店料を確認できます。</p></div><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></section>{Boolean(bids?.length) && <section className="panel"><div className="section-heading"><h2>区画指定・入札応募</h2></div><div className="application-list">{bids?.map(bid => { const bidEvent = bid.events as { title?: string } | null; return <article className="application-card" key={bid.id}><div><strong>{bidEvent?.title ?? 'イベント'}</strong><span>{bid.genre} ・ 提示額 {yen(bid.amount_yen)}</span><span>この金額を登録した日時：{new Date(bid.amount_submitted_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}（日本時間）</span></div><div><span className="status">{bid.status === 'waitlisted' ? '補欠' : '応募済み・締切後に選考'}</span><Link className="button button-secondary" href={`/vendor/events/${bid.event_id}`}>区画・応募条件を確認</Link></div></article> })}</div></section>}<section className="panel">{applications?.length ? <div className="application-list">{applications.map((application) => { const event = application.events as { title?: string; starts_at?: string; ends_at?: string; prefecture?: string; booth_fee_yen?: number; booth_map_path?: string | null } | null; const ended = Boolean(event?.ends_at && isEventEnded({ ends_at: event.ends_at })); const assignedSpace = spaceByApplicationId.get(application.id);
    const fee = application.booth_bid_id || application.status === 'paid'
      ? application.booth_fee_yen_snapshot : event?.booth_fee_yen
    return <article className="application-card" key={application.id}><div><strong>{event?.title ?? "イベント"}</strong><span>{event?.starts_at ? formatEventDate(event.starts_at) : ""} ・ {event?.prefecture ?? ""}</span>{assignedSpace && <span>割当区画: {assignedSpace.label}</span>}{fee != null && <span>{application.booth_bid_id ? '確定出店料（税込）' : '出店料'}：{yen(fee)}</span>}{application.message && <p>{application.message}</p>}</div><div><span className="status">{ended ? "開催終了" : applicationStatusLabel(application.status)}</span>{event?.booth_map_path && <Link className="button button-secondary" href={`/vendor/events/${application.event_id}`}>会場区画図を見る</Link>}{["approved", "paid"].includes(application.status) && <Link className="button button-secondary" href={`/vendor/day?event=${application.event_id}`}>当日の準備・連絡</Link>}{application.status === "approved" && !ended && ((fee == null || fee > 0) ? <span>有料オンライン決済は準備中です。主催者からの案内をご確認ください。</span> : <CheckoutButton applicationId={application.id} />)}</div></article> })}</div> : <div className="empty-state"><h2>応募はまだありません</h2><p>イベントを探して応募できます。</p><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></div>}</section></div>
}
