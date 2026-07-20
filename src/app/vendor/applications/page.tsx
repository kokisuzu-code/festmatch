import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { formatEventDate, isEventEnded } from "@/lib/events"
import CheckoutButton from "@/components/vendor/CheckoutButton"

export const dynamic = "force-dynamic"
export const metadata = { title: "応募状況", description: "FestMatchで送信した応募の状況を確認できます。" }

export default async function VendorApplicationsPage() {
  const { supabase, user } = await requireRole("vendor")
  const { data: vendor } = await supabase.from("vendors").select("id").eq("profile_id", user.id).maybeSingle()
  const { data: applications } = vendor ? await supabase.from("applications").select("id, event_id, status, message, created_at, events(title, starts_at, ends_at, prefecture, booth_fee_yen)").eq("vendor_id", vendor.id).order("created_at", { ascending: false }) : { data: [] }
  const applicationIds = (applications ?? []).map((application) => application.id)
  const { data: spaces } = applicationIds.length
    ? await supabase.from('event_spaces').select('label, assigned_application_id').in('assigned_application_id', applicationIds)
    : { data: [] }
  const spaceByApplicationId = new Map((spaces ?? []).flatMap((space) => space.assigned_application_id ? [[space.assigned_application_id, space] as const] : []))
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">MY APPLICATIONS</p><h1>応募状況</h1><p>承認後は出店料の決済に進めます。</p></div><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></section><section className="panel">{applications?.length ? <div className="application-list">{applications.map((application) => { const event = application.events as { title?: string; starts_at?: string; ends_at?: string; prefecture?: string; booth_fee_yen?: number } | null; const ended = Boolean(event?.ends_at && isEventEnded({ ends_at: event.ends_at })); const assignedSpace = spaceByApplicationId.get(application.id); return <article className="application-card" key={application.id}><div><strong>{event?.title ?? "イベント"}</strong><span>{event?.starts_at ? formatEventDate(event.starts_at) : ""} ・ {event?.prefecture ?? ""}</span>{assignedSpace && <span>割当区画: {assignedSpace.label}</span>}{application.message && <p>{application.message}</p>}</div><div><span className="status">{ended ? "開催終了" : application.status}</span>{application.status === "approved" && !ended && <CheckoutButton applicationId={application.id} />}</div></article> })}</div> : <div className="empty-state"><h2>応募はまだありません</h2><p>イベントを探して応募できます。</p><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></div>}</section></div>
}
