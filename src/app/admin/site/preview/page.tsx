import { requireSiteEditor } from '@/lib/site/server'
import { defaultSiteContent, parseSiteContent } from '@/lib/site/content'
import { renderMarketingHome } from '@/app/(marketing)/MarketingHome'
import { createPublicClient } from '@/lib/supabase/public'
import { listFestMapEvents } from '@/lib/festmap'
import type { PublicEvent } from '@/components/festmap/PublicEventCard'
import '@/app/(marketing)/marketing.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: '公式HPの下書きプレビュー | FestMatch', robots: { index: false, follow: false } }

export default async function SitePreviewPage() {
  const { supabase } = await requireSiteEditor()
  const { data } = await supabase.from('site_drafts').select('content').eq('page', 'home').maybeSingle()
  let events: PublicEvent[] = []
  try { events = await listFestMapEvents(createPublicClient()) } catch { /* Keep preview usable if events are unavailable. */ }
  return <><div className="fm-preview-bar">下書きプレビュー <a href="/admin/site">編集画面に戻る ↗</a></div>{renderMarketingHome(data ? parseSiteContent(data.content) : defaultSiteContent, events, false, false)}</>
}
