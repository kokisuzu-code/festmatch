import type { Metadata } from 'next'
import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'
import { PREFECTURES } from '@/lib/prefectures'
import { listFestMapEvents } from '@/lib/festmap'
import PublicEventMap from '@/components/festmap/PublicEventMap'
import PublicEventCard from '@/components/festmap/PublicEventCard'

// q/prefecture の検索クエリに依存するため常に動的レンダリングになる
// (Next.jsはsearchParams使用時点で自動的にdynamicとして扱う)。
// セッションは読まないので少なくともmiddleware/cookieコストは発生しない。
export const metadata: Metadata = {
  title: 'FestMap | 全国のイベントを探す',
  description: 'FestMapは、全国の祭り・イベントを地図と都道府県から探せるFestMatchの公開ディレクトリです。',
  openGraph: { title: 'FestMap | 全国のイベントを探す', description: '全国の公開イベントを地図から探せます。' },
}

export default async function FestMapPage({ searchParams }: { searchParams: Promise<{ q?: string; prefecture?: string }> }) {
  const { q, prefecture } = await searchParams
  const events = await listFestMapEvents(createPublicClient(), { query: q, prefecture })

  return (
    <main className="festmap-main">
      <section className="festmap-intro">
        <div><p className="eyebrow">FESTMAP</p><h1>全国のイベントを探す</h1><p>主催者が公開した募集情報と、公式ソースに基づく外部イベントを掲載しています。</p></div>
        <form className="festmap-search"><input name="q" defaultValue={q ?? ''} placeholder="イベント名で検索" /><select name="prefecture" defaultValue={prefecture ?? ''}><option value="">すべての都道府県</option>{PREFECTURES.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select><button className="button button-primary">検索</button></form>
      </section>
      <div className="prefecture-links">{PREFECTURES.map((item) => <Link key={item.slug} href={`/festmap/${item.slug}`}>{item.name}</Link>)}</div>
      <section className="festmap-grid">
        <PublicEventMap events={events} />
        <div className="public-event-list"><div className="section-heading"><div><p className="eyebrow">UPCOMING EVENTS</p><h2>公開イベント</h2></div><span>{events.length} 件</span></div>{events.length ? events.map((event) => <PublicEventCard key={`${event.is_external ? 'external' : 'festmatch'}-${event.id}`} event={event} />) : <div className="empty-state"><h2>公開中のイベントがありません</h2><p>条件を変更するか、後ほどもう一度ご確認ください。</p></div>}</div>
      </section>
    </main>
  )
}
