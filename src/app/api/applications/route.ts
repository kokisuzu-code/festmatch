import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isApplicationClosed } from "@/lib/events"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyOrganizerOfApplication, notifyVendorOfApplicationReceived } from "@/lib/notifications"
import { findGenreSlotAvailability, getGenreSlotAvailability } from '@/lib/slots'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 })
  let body: { event_id?: string; message?: string }
  try { body = await request.json() as { event_id?: string; message?: string } } catch { return NextResponse.json({ error: "送信内容を確認してください。" }, { status: 400 }) }
  if (!body.event_id || !/^[a-f0-9-]{36}$/i.test(body.event_id)) return NextResponse.json({ error: "イベントが指定されていません。" }, { status: 400 })
  const message = body.message?.trim() || null
  if (message && message.length > 2_000) return NextResponse.json({ error: "応募メッセージは2,000文字以内で入力してください。" }, { status: 400 })
  const [{ data: vendor }, { data: event }] = await Promise.all([
    supabase.from("vendors").select("id, name, genre").eq("profile_id", user.id).maybeSingle(),
    supabase.from("events").select("id, organizer_id, title, starts_at, ends_at, application_deadline_at, status").eq("id", body.event_id).maybeSingle(),
  ])
  if (!vendor) return NextResponse.json({ error: "ベンダープロフィールを設定してください。" }, { status: 403 })
  if (event?.status !== 'published' || isApplicationClosed(event)) return NextResponse.json({ error: "このイベントは現在応募を受け付けていません。" }, { status: 409 })
  const slotsByEvent = await getGenreSlotAvailability([event.id])
  const matchingSlot = findGenreSlotAvailability(slotsByEvent.get(event.id), vendor.genre)
  if (matchingSlot?.isFull) return NextResponse.json({ error: `${matchingSlot.genre}枠は満了です。` }, { status: 409 })
  const { error } = await supabase.from("applications").insert({ event_id: event.id, vendor_id: vendor.id, message })
  if (error) {
    const slotFull = /genre|slot|capacity|満了/i.test(error.message)
    return NextResponse.json({ error: error.code === "23505" ? "すでに応募済みです。" : slotFull ? 'このジャンルの枠は満了です。' : "応募を送信できませんでした。" }, { status: slotFull ? 409 : 400 })
  }
  const { data: organizer } = await createAdminClient().from("organizers").select("profile_id").eq("id", event.organizer_id).maybeSingle()
  if (organizer?.profile_id) void notifyOrganizerOfApplication({ organizerOwnerId: organizer.profile_id, eventTitle: event.title, vendorName: vendor.name }).catch(() => undefined)
  void notifyVendorOfApplicationReceived({ vendorOwnerId: user.id, eventTitle: event.title }).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
