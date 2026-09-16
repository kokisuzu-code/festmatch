import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { eventStateLabel, formatEventDate, isEventEnded } from "@/lib/events"
import { yen } from "@/lib/app"

export const dynamic = "force-dynamic"
export const metadata = { title: "イベント管理", description: "FestMatchでイベントの作成、公開、応募管理を行います。" }

export default async function OrganizerEventsPage() {
  const { supabase, user } = await requireRole("organizer")
  const { data: organizer } = await supabase.from("organizers").select("id").eq("profile_id", user.id).single()
  const { data: events } = organizer ? await supabase.from("events").select("id, title, starts_at, ends_at, application_deadline_at, address, prefecture, booth_fee_yen, capacity, status, applications(id, status)").eq("organizer_id", organizer.id).order("starts_at", { ascending: false }) : { data: [] }
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">EVENT MANAGEMENT</p><h1>イベント管理</h1><p>公開状態と応募状況を確認できます。</p></div><Link className="button button-primary" href="/organizer/events/new">イベントを作成</Link></section><section className="panel">{events?.length ? <div className="event-list">{events.map((event) => { const applications = event.applications ?? []; const closed = isEventEnded(event); return <Link className="event-row event-card-row" key={event.id} href={`/organizer/events/${event.id}`}><div><strong>{event.title}</strong><span>{formatEventDate(event.starts_at)} ・ {event.prefecture}{event.address ? ` ・ ${event.address}` : ""}</span><span>{event.status === 'published' ? eventStateLabel(event) : "下書き"} ・ 応募 {applications.length}件 ・ {yen(event.booth_fee_yen ?? 0)}</span></div><span className={closed ? "status" : event.status === 'published' ? "status status-published" : "status"}>{closed ? "開催終了" : event.status === 'published' ? "公開中" : "下書き"}</span></Link> })}</div> : <div className="empty-state"><h2>イベントはまだありません</h2><p>公開すると、ベンダーが検索して無料プランを含めて応募できます。</p><Link className="button button-primary" href="/organizer/events/new">イベントを作成</Link></div>}</section></div>
}
