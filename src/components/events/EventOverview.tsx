/* eslint-disable @next/next/no-img-element */
import { eventImageUrl, type EventDetails } from '@/lib/event-presentation'
import { yen } from '@/lib/app'
import type { GenreCap } from '@/lib/booth-bidding'

export type OverviewEvent = {
  title: string; description?: string | null; address?: string | null; prefecture?: string;
  starts_at: string; ends_at: string; application_deadline_at?: string | null;
  capacity?: number | null; booth_fee_yen?: number; booth_bidding_enabled?: boolean;
  cover_photo_path?: string | null; has_power?: boolean; has_water?: boolean;
  cancellation_policy?: string | null; expected_visitors?: number | null;
  operations_info?: EventDetails | null;
}
function date(value?: string | null) {
  if (!value) return '未設定'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
export default function EventOverview({ event, slots = [], coverUrl }: { event: OverviewEvent; slots?: GenreCap[]; coverUrl?: string | null }) {
  const image = coverUrl ?? eventImageUrl(event.cover_photo_path)
  const details = event.operations_info ?? {}
  return <div className="event-overview">
    {image && <a href={image} target="_blank" rel="noreferrer" className="event-poster"><img src={image} alt={`${event.title}のポスター`} /><span>ポスターを拡大</span></a>}
    <section className="panel"><p className="eyebrow">ABOUT THE EVENT</p><h2>{event.title}</h2><p className="event-prose">{event.description || 'イベントの紹介は準備中です。'}</p>
      <dl className="event-facts"><div><dt>開催日時</dt><dd>{date(event.starts_at)} 〜 {date(event.ends_at)}</dd></div><div><dt>会場</dt><dd>{String(details.venue_name || '会場名未設定')}<br />{[event.prefecture, event.address].filter(Boolean).join(' ')}</dd></div><div><dt>応募締切</dt><dd>{date(event.application_deadline_at)}</dd></div><div><dt>出店料</dt><dd>{event.booth_bidding_enabled ? `最低額は区画ごとに表示／提示額で確定（基準 ${yen(event.booth_fee_yen ?? 0)}）` : `${yen(event.booth_fee_yen ?? 0)}／店舗`}</dd></div><div><dt>募集台数</dt><dd>{event.capacity ?? '未設定'}台</dd></div>{event.expected_visitors ? <div><dt>想定来場者</dt><dd>{event.expected_visitors.toLocaleString('ja-JP')}人（主催者見込み）</dd></div> : null}</dl>
    </section>
    <section className="panel"><h2>主催者から出店者の皆さまへ</h2><p className="event-prose">{String(details.host_message || '個別の要望は記載されていません。')}</p><h3>募集内容・出店条件</h3><p className="event-prose">{String(details.requirements || '詳細は主催者へご確認ください。')}</p><div className="tag-row">{slots.length ? slots.map(slot => <span key={slot.genre}>{slot.genre}：{slot.capacity ? `${slot.capacity}台募集` : '募集なし'}</span>) : <span>ジャンル別の募集制限なし</span>}</div></section>
    <section className="panel"><h2>設備・搬入・キャンセルについて</h2><div className="tag-row"><span>電源：{event.has_power ? '提供あり' : '提供なし'}</span><span>給水：{event.has_water ? '設備あり' : '設備なし'}</span></div><h3>搬入・当日の案内</h3><p className="event-prose">{String(details.loading_info || '準備中です。確定後に主催者から案内します。')}</p><h3>キャンセル条件</h3><p className="event-prose">{event.cancellation_policy || '応募前に主催者へご確認ください。'}</p></section>
  </div>
}
