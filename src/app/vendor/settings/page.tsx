import { requireRole } from "@/lib/auth"
import { VENDOR_PLANS } from "@/lib/app"
import { updateVendorProfile } from "@/app/vendor/settings/actions"
import SubscriptionControls from "@/components/vendor/SubscriptionControls"
import SubmitButton from "@/components/SubmitButton"

export const dynamic = "force-dynamic"
export const metadata = { title: "ベンダープロフィール", description: "FestMatchのベンダープロフィールとプランを管理します。" }

export default async function VendorSettingsPage() {
  const { supabase, user } = await requireRole("vendor")
  const { data: vendor } = await supabase.from("vendors").select("name, genre, description, slug, photo_paths, subscription_tier").eq("profile_id", user.id).maybeSingle()
  const tier = (vendor?.subscription_tier ?? "free") as keyof typeof VENDOR_PLANS
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">VENDOR PROFILE</p><h1>プロフィール</h1><p>プロフィールの公開写真は {VENDOR_PLANS[tier].photoLimit} 枚まで表示されます。アップロード数は制限しません。</p></div></section><form action={updateVendorProfile} className="panel form-stack"><div className="section-heading"><div><p className="eyebrow">PUBLIC PROFILE</p><h2>基本情報</h2></div></div><label className="field">屋号<input name="name" required defaultValue={vendor?.name ?? ""} /></label><label className="field">ジャンル<input name="genre" required defaultValue={vendor?.genre ?? ""} /></label><label className="field">紹介文<textarea name="description" rows={5} defaultValue={vendor?.description ?? ""} /></label><label className="field">公開プロフィールURL（Proプラン）<input name="slug" defaultValue={vendor?.slug ?? ""} placeholder="your-shop" /><small>https://festmatch-pink.vercel.app/festmap/vendors/ の末尾を設定します。</small></label><label className="field">写真パス（1行に1つ）<textarea name="photo_paths" rows={5} defaultValue={Array.isArray(vendor?.photo_paths) ? vendor.photo_paths.join("\n") : ""} placeholder="vendor-id/profile.jpg" /><small>`vendor-photos` バケット内の所有パスを指定します。公開ページではプランに応じた枚数だけを表示します。</small></label><SubmitButton pendingLabel="保存中…">保存する</SubmitButton></form><section className="panel"><div className="section-heading"><div><p className="eyebrow">SUBSCRIPTION</p><h2>{VENDOR_PLANS[tier].label} プラン</h2></div><span className="status">{VENDOR_PLANS[tier].price === 0 ? "年額 ¥0" : `年額 ¥${VENDOR_PLANS[tier].price.toLocaleString()}`}</span></div><p className="panel-copy">どのプランでもイベントへの応募、出店、決済は利用できます。上位プランは応募手数料の割引と公開プロフィールの特典を提供します。</p><SubscriptionControls /></section></div>
}
