import Link from "next/link"
import { formatEventDate, eventStateLabel } from "@/lib/events"
import { yen } from "@/lib/app"

export type PublicEvent = {
  id: string; slug: string; title: string; description: string | null; prefecture: string; address: string | null
  starts_at: string; ends_at: string; application_deadline_at: string | null; booth_fee_yen: number | null
  is_external: boolean; official_url: string | null; latitude: number | null; longitude: number | null; created_at: string
}

export default function PublicEventCard({ event }: { event: PublicEvent }) {
  const body = <><p className="eyebrow">{event.prefecture}{event.is_external ? " ・ 外部イベント" : ""}</p><h2>{event.title}</h2><p>{formatEventDate(event.starts_at)} ・ {event.address ?? "会場未設定"}</p><p>{event.description?.slice(0, 120) ?? "イベントの詳細はページでご確認ください。"}</p><div className="public-tags"><span>{event.is_external ? "外部イベント" : yen(event.booth_fee_yen ?? 0)}</span><span>{event.is_external ? "公式情報を確認" : eventStateLabel(event)}</span></div></>
  if (event.is_external && event.official_url) return <article className="public-event-card external-event"><div>{body}</div><a className="button button-secondary" href={event.official_url} target="_blank" rel="nofollow noopener noreferrer">公式情報を見る</a></article>
  return <Link className="public-event-card" href={`/festmap/events/${event.slug}`}><div>{body}</div><span className="text-link">詳細を見る</span></Link>
}
