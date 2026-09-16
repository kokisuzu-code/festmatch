import { requireRole } from "@/lib/auth"
import { VENDOR_PLANS } from "@/lib/app"
import SubscriptionControls from "@/components/vendor/SubscriptionControls"
import VendorProfileForm from "@/components/vendor/VendorProfileForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "ベンダープロフィール", description: "FestMatchのベンダープロフィールとプランを管理します。" }

export default async function VendorSettingsPage() {
  const { supabase, user } = await requireRole("vendor")
  const { data: vendor } = await supabase.from("vendors").select("id, name, genre, description, slug, photo_paths, subscription_tier").eq("profile_id", user.id).maybeSingle()
  const tier = (vendor?.subscription_tier ?? "free") as keyof typeof VENDOR_PLANS
  const photoPaths = Array.isArray(vendor?.photo_paths)
    ? vendor.photo_paths.filter((path): path is string => typeof path === "string")
    : []

  return <div className="dashboard-stack">
    <section className="dashboard-hero">
      <div>
        <p className="eyebrow">VENDOR PROFILE</p>
        <h1>プロフィール</h1>
        <p>プロフィールの公開写真は {VENDOR_PLANS[tier].photoLimit} 枚まで表示されます。アップロード数は制限しません。</p>
      </div>
    </section>
    <VendorProfileForm
      vendorId={vendor?.id ?? ""}
      name={vendor?.name ?? ""}
      genre={vendor?.genre ?? ""}
      description={vendor?.description ?? ""}
      slug={vendor?.slug ?? ""}
      initialPhotoPaths={photoPaths}
      publicPhotoLimit={VENDOR_PLANS[tier].photoLimit}
    />
    <section className="panel">
      <div className="section-heading">
        <div><p className="eyebrow">SUBSCRIPTION</p><h2>{VENDOR_PLANS[tier].label} プラン</h2></div>
        <span className="status">{VENDOR_PLANS[tier].price === 0 ? "年額 ¥0" : `年額 ¥${VENDOR_PLANS[tier].price.toLocaleString()}`}</span>
      </div>
      <p className="panel-copy">どのプランでもイベントへの応募、出店、決済は利用できます。上位プランは応募手数料の割引と公開プロフィールの特典を提供します。</p>
      <SubscriptionControls />
    </section>
  </div>
}
