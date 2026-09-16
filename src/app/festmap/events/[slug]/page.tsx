import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import { getFestMapEventBySlug } from '@/lib/festmap'
import { APP_URL, yen } from '@/lib/app'
import { eventStateLabel, formatEventDate, isEventEnded } from '@/lib/events'
import PublicEventMap from '@/components/festmap/PublicEventMap'

// イベント詳細: slug単位でオンデマンドにISR生成し、60秒間隔で再検証する。
export const revalidate = 60

async function getEvent(slug: string) {
  return getFestMapEventBySlug(createPublicClient(), slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = await getEvent((await params).slug)
  if (!event) return { title: 'イベントが見つかりません' }
  const title = `${event.title} | FestMap`
  const description = `${event.prefecture}で開催される${event.title}の詳細情報です。`
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/festmap/events/${event.slug}` },
    openGraph: { title, description },
  }
}

export default async function FestMapEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug)
  if (!event) notFound()
  const ended = isEventEnded(event)
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Event', name: event.title,
    startDate: event.starts_at, endDate: event.ends_at,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: ended ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: event.address ?? event.prefecture, address: { '@type': 'PostalAddress', addressRegion: event.prefecture, streetAddress: event.address ?? undefined } },
    description: event.description ?? undefined,
    url: `${APP_URL}/festmap/events/${event.slug}`,
  }
  return <main className="festmap-main"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><section className={`public-detail ${event.is_external ? 'external-event' : ''}`}><div><p className="eyebrow">{event.prefecture}{event.is_external ? ' ・ 外部イベント' : ''}</p><h1>{event.title}</h1><p className="detail-lead">{event.description ?? 'イベントの詳細をご確認ください。'}</p><dl className="detail-facts"><div><dt>開催日時</dt><dd>{formatEventDate(event.starts_at)} から {formatEventDate(event.ends_at)}</dd></div><div><dt>会場</dt><dd>{event.address ?? '未設定'}</dd></div>{!event.is_external && <><div><dt>出店料</dt><dd>{yen(event.booth_fee_yen ?? 0)}</dd></div><div><dt>募集状況</dt><dd>{eventStateLabel(event)}</dd></div></>}</dl>{event.is_external ? event.official_url ? <a className="button button-secondary" href={event.official_url} target="_blank" rel="nofollow noopener noreferrer">公式情報を見る</a> : <span className="status">公式情報を確認中</span> : ended ? <span className="status">開催終了</span> : <Link className="button button-primary" href={`/apply/${event.slug}`}>出店に応募する</Link>}</div><PublicEventMap events={[event]} className="public-detail-map" /></section><section className="archive-note"><h2>{ended ? 'このイベントは開催終了です' : event.is_external ? '公式情報に基づく外部イベントです' : '主催者からの公開情報です'}</h2><p>{ended ? 'イベントページは実績アーカイブとして公開を継続しています。' : event.is_external ? '詳細や最新情報は公式サイトでご確認ください。' : '応募内容や支払いはFestMatchで安全に管理されます。'}</p></section></main>
}
