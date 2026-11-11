import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import { findPrefectureBySlug, PREFECTURES } from '@/lib/prefectures'
import { listFestMapEvents } from '@/lib/festmap'
import { getPublishedFestMapDesign } from '@/lib/site/published-festmap'
import PublicEventDirectory from '@/components/festmap/PublicEventDirectory'

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
  const client = createPublicClient()
  const [events, design] = await Promise.all([
    listFestMapEvents(client, { prefecture: prefecture.name }),
    getPublishedFestMapDesign(client),
  ])
  return <PublicEventDirectory design={design} events={events} prefecture={prefecture.name} regionalPage />
}
