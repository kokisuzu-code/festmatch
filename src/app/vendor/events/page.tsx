import { eventSearchFilter } from '@/lib/event-search'
import { PREFECTURES } from '@/lib/prefectures'
import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { eventStateLabel, formatEventDate, isApplicationClosed } from "@/lib/events"
import { yen } from "@/lib/app"
import ApplyButton from "@/components/vendor/ApplyButton"
import { findGenreSlotAvailability, getGenreSlotAvailability } from '@/lib/slots'

export const dynamic = "force-dynamic"
export const metadata = { title: "イベントを探す", description: "FestMatchの公開イベントを探して応募できます。" }

export default async function VendorEventsPage({ searchParams }: { searchParams: Promise<{ prefecture?: string; q?: string }> }) {
  const { prefecture, q } = await searchParams
  const { supabase, user } = await requireRole("vendor")
  const { data: vendor } = await supabase.from('vendors').select('id, genre').eq('profile_id', user.id).maybeSingle()
  let query = supabase.from("events").select("id, slug, title, description, address, prefecture, starts_at, ends_at, application_deadline_at, booth_fee_yen, status").eq("status", 'published').gte("ends_at", new Date().toISOString()).order("starts_at")
  if (prefecture) query = query.eq("prefecture", prefecture)
  const search = eventSearchFilter(q)
  if (search) query = query.or(search)
  const { data: events, error } = await query
  if (error) throw new Error("イベントを読み込めませんでした。")
  const slotsByEvent = await getGenreSlotAvailability((events ?? []).map((event) => event.id))
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">DISCOVER EVENTS</p><h1>イベントを探す</h1><p>無料プランを含め、すべてのベンダーが公開イベントへ応募できます。</p></div></section><form className="filter-form"><input name="q" defaultValue={q ?? ""} aria-label="イベント名・エリア名" placeholder="イベント名・エリア名で検索" /><select aria-label="都道府県" name="prefecture" defaultValue={prefecture ?? ""}><option value="">すべての都道府県</option>{PREFECTURES.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select><button className="button button-secondary">絞り込む</button></form><section className="event-browser">{events?.length ? events.map((event) => { const closed = isApplicationClosed(event); const matchingSlot = findGenreSlotAvailability(slotsByEvent.get(event.id), vendor?.genre); const slotReason = matchingSlot?.isFull ? `${matchingSlot.genre}枠は満了` : undefined; return <article className="browser-card" key={event.id}><div><p className="eyebrow">{event.prefecture}</p><h2>{event.title}</h2><p>{formatEventDate(event.starts_at)} ・ {event.address ?? "会場未設定"}</p><p>{event.description}</p><div className="tag-row"><span>{yen(event.booth_fee_yen ?? 0)}</span><span>{eventStateLabel(event)}</span>{matchingSlot && <span className={matchingSlot.isFull ? 'slot-full-tag' : ''}>{matchingSlot.genre} {matchingSlot.isFull ? '枠満了' : `残り${matchingSlot.remaining}枠`}</span>}</div></div><ApplyButton eventId={event.id} closed={closed} disabledReason={slotReason} /></article> }) : <div className="empty-state"><h2>条件に合うイベントがありません</h2><p>条件を変えて再度検索してください。</p><Link className="button button-secondary" href="/vendor/events">条件をリセット</Link></div>}</section></div>
}
