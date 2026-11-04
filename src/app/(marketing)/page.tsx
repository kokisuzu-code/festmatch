import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { listFestMapEvents } from '@/lib/festmap'
import { defaultSiteContent, parseSiteContent } from '@/lib/site/content'
import { renderMarketingHome } from './MarketingHome'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'FestMatch | 街のイベントを見つける',
  description: '地域のイベントを探し、開催し、出店する。FestMatchは街の楽しみをつなぐプラットフォームです。',
  openGraph: { title: 'FestMatch | 街のイベントを見つける', description: '近くのイベントを探す。主催する。出店する。', url: 'https://festmatch-pink.vercel.app', siteName: 'FestMatch', locale: 'ja_JP', type: 'website' },
}


export default async function MarketingPage() {
  const client = createPublicClient()
  const [contentResult, eventsResult] = await Promise.allSettled([
    client.from('site_published').select('content').eq('page', 'home').maybeSingle(),
    listFestMapEvents(client),
  ])
  const content = contentResult.status === 'fulfilled' && contentResult.value.data ? parseSiteContent(contentResult.value.data.content) : defaultSiteContent
  const events = eventsResult.status === 'fulfilled' ? eventsResult.value : []
  return renderMarketingHome(content, events, eventsResult.status === 'rejected')
}
