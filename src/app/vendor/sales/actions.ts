'use server'

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"

export async function recordSales(formData: FormData) {
  const { supabase, user } = await requireRole("vendor")
  const eventId = String(formData.get("event_id") ?? "")
  const grossSalesYen = Number(formData.get("amount") ?? 0)
  if (!eventId || !Number.isFinite(grossSalesYen) || grossSalesYen < 0) throw new Error("イベントと正しい売上額を入力してください。")
  const { data: vendor } = await supabase.from("vendors").select("id").eq("profile_id", user.id).single()
  if (!vendor) throw new Error("ベンダープロフィールが見つかりません。")
  const { error } = await supabase.from("sales_records").upsert({ event_id: eventId, vendor_id: vendor.id, gross_sales_yen: grossSalesYen, sales_date: new Date().toISOString().slice(0, 10), source: 'manual' }, { onConflict: "vendor_id,event_id,sales_date" })
  if (error) throw new Error("売上を保存できませんでした。")
  revalidatePath("/vendor/sales")
}
