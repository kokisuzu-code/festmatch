import Link from 'next/link'
import { requireSiteEditor } from '@/lib/site/server'
import { defaultSiteContent, parseSiteContent } from '@/lib/site/content'
import SiteEditor from './SiteEditor'
import './site-editor.css'

export const metadata = { title: '公式HPを編集 | FestMatch' }

export default async function SiteEditorPage() {
  const { supabase } = await requireSiteEditor()
  const [{ data: draft }, { data: published }] = await Promise.all([
    supabase.from('site_drafts').select('content, updated_at').eq('page', 'home').maybeSingle(),
    supabase.from('site_published').select('content, published_at').eq('page', 'home').maybeSingle(),
  ])
  return <main className="site-editor-page">
    <header className="site-editor-header"><Link href="/organizer">← 管理画面に戻る</Link><strong>FestMatch <span>公式HP編集</span></strong><Link href="/home" target="_blank">公開サイトを見る ↗</Link></header>
    <SiteEditor initial={draft ? parseSiteContent(draft.content) : published ? parseSiteContent(published.content) : defaultSiteContent} lastSaved={draft?.updated_at ?? null} lastPublished={published?.published_at ?? null} />
  </main>
}
