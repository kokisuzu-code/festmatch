import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { VENDOR_PLANS } from "@/lib/app"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "ベンダーダッシュボード",
  description: "イベントへの応募と出店状況を管理するFestMatchベンダーダッシュボードです。",
}

export default async function VendorPage() {
  const { supabase, user, profile } = await requireRole("vendor")
  const { data: vendor } = await supabase.from("vendors").select("id, name, genre, subscription_tier").eq("profile_id", user.id).maybeSingle()
  const { data: applications } = vendor
    ? await supabase.from("applications").select("id, status, created_at, events(title, starts_at, ends_at, prefecture)").eq("vendor_id", vendor.id).order("created_at", { ascending: false })
    : { data: [] }
  const current = (applications ?? []).filter((application) => application.status !== "cancelled")
  const approved = current.filter((application) => application.status === "approved" || application.status === "paid")
  const tier = (vendor?.subscription_tier ?? "free") as keyof typeof VENDOR_PLANS
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">ベンダーダッシュボード</p><h1>{vendor?.name ?? profile?.display_name ?? "ベンダー"}</h1><p>{vendor?.genre ?? "ジャンル未設定"}・{VENDOR_PLANS[tier].label} プラン</p></div><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></section><section className="metric-grid"><div className="metric-card"><span>応募中</span><strong>{current.filter((application) => application.status === "pending").length}</strong><small>無料プランも応募可能</small></div><div className="metric-card"><span>承認済み</span><strong>{approved.length}</strong><small>決済待ちを含む</small></div><div className="metric-card"><span>公開写真の上限</span><strong>{VENDOR_PLANS[tier].photoLimit}</strong><small>アップロード数は制限しません</small></div></section><section className="panel"><div className="section-heading"><div><p className="eyebrow">応募</p><h2>最近の応募</h2></div><Link href="/vendor/applications">すべて見る</Link></div>{current.length ? <div className="event-list">{current.slice(0, 5).map((application) => <Link className="event-row" key={application.id} href="/vendor/applications"><div><strong>{(application.events as { title?: string } | null)?.title ?? "イベント"}</strong><span>{(application.events as { prefecture?: string } | null)?.prefecture ?? ""}</span></div><span className="status">{application.status}</span></Link>)}</div> : <div className="empty-state"><h3>応募はまだありません</h3><p>条件に合うイベントを探して応募できます。</p><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></div>}</section></div>
}
