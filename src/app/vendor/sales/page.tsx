import { requireRole } from "@/lib/auth"
import { recordSales } from "@/app/vendor/sales/actions"
import { yen } from "@/lib/app"

export const dynamic = "force-dynamic"
export const metadata = { title: "売上記録", description: "FestMatchで出店ごとの売上を記録します。" }

export default async function SalesPage() {
  const { supabase, user } = await requireRole("vendor")
  const { data: vendor } = await supabase.from("vendors").select("id").eq("profile_id", user.id).maybeSingle()
  const { data: applications } = vendor ? await supabase.from("applications").select("event_id, status, events(title, starts_at)").eq("vendor_id", vendor.id).in("status", ["approved", "paid"]) : { data: [] }
  const { data: records } = vendor ? await supabase.from("sales_records").select("event_id, gross_sales_yen, sales_date").eq("vendor_id", vendor.id) : { data: [] }
  const recordByEvent = new Map((records ?? []).map((record) => [record.event_id, record]))
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">SALES RECORDS</p><h1>売上記録</h1><p>入力した個社売上は主催者に公開されません。主催者へは匿名化したジャンル別統計のみ共有されます。</p></div></section><section className="panel">{applications?.length ? <div className="event-list">{applications.map((application) => { const event = application.events as { title?: string; starts_at?: string } | null; const record = recordByEvent.get(application.event_id); return <form key={application.event_id} action={recordSales} className="sales-row"><div><strong>{event?.title ?? "イベント"}</strong><span>{event?.starts_at ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(event.starts_at)) : ""}</span></div><input type="hidden" name="event_id" value={application.event_id} /><label className="field">売上（円）<input name="amount" type="number" min="0" defaultValue={record?.gross_sales_yen ?? ""} /></label><button className="button button-primary">保存</button>{record && <span>{yen(record.gross_sales_yen)}</span>}</form> })}</div> : <div className="empty-state"><h2>記録対象の出店がありません</h2><p>承認された出店の売上を任意で記録できます。</p></div>}</section></div>
}
