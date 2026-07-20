import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'
import { findPrefectureBySlug, PREFECTURES } from '@/lib/prefectures'
import { listFestMapEvents } from '@/lib/festmap'
import PublicEventMap from '@/components/festmap/PublicEventMap'
import PublicEventCard from '@/components/festmap/PublicEventCard'

// 都道府県別ページ: 47件をビルド時に静的生成し、以後は60秒間隔のISRで更新する。
export const revalidate = 60
export function generateStaticParams() {
  return PREFECTURES.map((prefecture) => ({ prefecture: prefecture.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ prefecture: string }> }): Promise<Metadata> {
  const prefecture = findPrefectureBySlug((await params).prefecture)
  if (!prefecture) return { title: 'ページが見つかりません' }
  return { title: `${prefecture.name}のイベント | FestMap`, description: `${prefecture.name}で開催される祭り・イベントをFestMapで探せます。`, openGraph: { title: `${prefecture.name}のイベント | FestMap`, description: `${prefecture.name}の公開イベント一覧です。` } }
}

export default async function PrefecturePage({ params }: { params: Promise<{ prefecture: string }> }) {
  const prefecture = findPrefectureBySlug((await params).prefecture)
  if (!prefecture) notFound()
  const events = await listFestMapEvents(createPublicClient(), { prefecture: prefecture.name })
  return <main className="festmap-main"><section className="festmap-intro compact"><div><p className="eyebrow">FESTMAP / {prefecture.name}</p><h1>{prefecture.name}のイベント</h1><p>開催予定の公開イベントを一覧でご案内します。</p></div><Link className="button button-secondary" href="/festmap">全国のイベントを見る</Link></section><div className="prefecture-links">{PREFECTURES.map((item) => <Link key={item.slug} className={item.slug === prefecture.slug ? 'active' : ''} href={`/festmap/${item.slug}`}>{item.name}</Link>)}</div><section className="festmap-grid"><PublicEventMap events={events} /><div className="public-event-list"><div className="section-heading"><div><p className="eyebrow">UPCOMING EVENTS</p><h2>{prefecture.name}の公開イベント</h2></div><span>{events.length} 件</span></div>{events.length ? events.map((event) => <PublicEventCard key={`${event.is_external ? 'external' : 'festmatch'}-${event.id}`} event={event} />) : <div className="empty-state"><h2>公開中のイベントがありません</h2><p>新しいイベントが公開されるとここに表示されます。</p></div>}</div></section></main>
}
