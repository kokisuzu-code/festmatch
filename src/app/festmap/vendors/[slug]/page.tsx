import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createPublicClient } from "@/lib/supabase/public"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { VENDOR_PLANS, type VendorTier } from "@/lib/app"

// ベンダー公開プロフィール: slug単位でオンデマンドにISR生成し、60秒間隔で再検証する。
export const revalidate = 60

async function getVendor(slug: string) { const supabase = createPublicClient(); const { data } = await supabase.from("vendors_public").select("id, name, slug, genre, description, photo_paths, subscription_tier, created_at").eq("slug", slug).maybeSingle(); return data }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const vendor = await getVendor((await params).slug)
  if (!vendor) return { title: "ベンダーが見つかりません" }
  return { title: `${vendor.name} | FestMap`, description: `${vendor.genre}のベンダー ${vendor.name} の公開プロフィールです。`, openGraph: { title: `${vendor.name} | FestMap`, description: `${vendor.genre}のベンダー公開プロフィール` } }
}

export default async function VendorPublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const vendor = await getVendor((await params).slug); if (!vendor) notFound()
  const tier = (vendor.subscription_tier ?? "free") as VendorTier
  const photos = Array.isArray(vendor.photo_paths)
    ? vendor.photo_paths
      .filter((photo): photo is string => typeof photo === "string")
      .slice(0, VENDOR_PLANS[tier].photoLimit)
      .map((path) => `${getSupabaseUrl()}/storage/v1/object/public/vendor-photos/${path.split('/').map(encodeURIComponent).join('/')}`)
    : []
  return <main className="festmap-main"><section className="vendor-public-profile"><p className="eyebrow">VENDOR PROFILE</p><h1>{vendor.name}</h1><p className="vendor-genre">{vendor.genre}</p><p className="detail-lead">{vendor.description ?? "公開プロフィールの紹介文はまだ登録されていません。"}</p>{photos.length > 0 && <div className="vendor-photo-grid">{photos.map((photo, index) => <div className="vendor-photo" key={photo} style={{ backgroundImage: `url(${photo})` }} role="img" aria-label={`${vendor.name} の写真 ${index + 1}`} />)}</div>}<p className="privacy-note">この公開プロフィールには、売上、応募、Stripe関連の情報は含まれません。</p></section></main>
}
