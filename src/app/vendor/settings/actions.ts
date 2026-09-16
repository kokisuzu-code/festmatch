'use server'

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"

export async function updateVendorProfile(formData: FormData) {
  const { supabase, user } = await requireRole("vendor")
  const name = String(formData.get("name") ?? "").trim()
  const genre = String(formData.get("genre") ?? "").trim()
  if (!name || !genre) throw new Error("屋号とジャンルを入力してください。")
  const { data: current } = await supabase.from("vendors").select("subscription_tier, slug").eq("profile_id", user.id).single()
  const requestedSlug = String(formData.get("slug") ?? "").trim().toLowerCase()
  if (requestedSlug && current?.subscription_tier !== "pro") throw new Error("公開プロフィールURLのカスタマイズはProプランの特典です。")
  const slug = requestedSlug ? requestedSlug.replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") : current?.slug
  if (requestedSlug && !slug) throw new Error("公開プロフィールURLは英数字とハイフンで入力してください。")
  const photoPaths = String(formData.get("photo_paths") ?? "").split(/\n/).map((value) => value.trim()).filter(Boolean)
  const { error } = await supabase.from("vendors").update({ name, genre, description: String(formData.get("description") ?? "").trim() || null, slug, photo_paths: photoPaths }).eq("profile_id", user.id)
  if (error) throw new Error("プロフィールを保存できませんでした。")
  revalidatePath("/vendor"); revalidatePath("/vendor/settings")
}
