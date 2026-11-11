import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { listFestMapEvents } from '@/lib/festmap'
import PublicEventDirectory from '@/components/festmap/PublicEventDirectory'

// q/prefecture の検索クエリに依存するため常に動的レンダリングになる
// (Next.jsはsearchParams使用時点で自動的にdynamicとして扱う)。
// セッションは読まないので少なくともmiddleware/cookieコストは発生しない。
export const metadata: Metadata = {
  title: 'FestMap | 全国のイベントを探す',
  description: 'FestMapは、全国の祭り・イベントをキーワードと都道府県で探せるFestMatchの公開ディレクトリです。',
  openGraph: { title: 'FestMap | 全国のイベントを探す', description: '全国の公開イベントをキーワードと都道府県で探せます。' },
}

export default async function FestMapPage({ searchParams }: { searchParams: Promise<{ q?: string; prefecture?: string }> }) {
  const { q, prefecture } = await searchParams
  const events = await listFestMapEvents(createPublicClient(), { query: q, prefecture })

  return <PublicEventDirectory events={events} query={q} prefecture={prefecture} />
}
