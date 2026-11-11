import Link from 'next/link'
import { BrandLogo } from '@/components/BrandMark'
import { requireSiteEditor } from '@/lib/site/server'
import { readFestMapDesign } from '@/lib/site/festmap-design'
import DesignEditor from './DesignEditor'
import '../site-editor.css'

export const metadata = { title: 'FestMapのデザイン編集', robots: { index: false, follow: false } }

export default async function FestMapEditorPage() {
  const { supabase } = await requireSiteEditor()
  const [draft, published] = await Promise.all([
    supabase.from('site_drafts').select('content, updated_at').eq('page', 'festmap').maybeSingle(),
    supabase.from('site_published').select('content, published_at').eq('page', 'festmap').maybeSingle(),
  ])
  if (draft.error || published.error) throw new Error('編集内容を読み込めませんでした。')
  return <main className="site-editor-page">
    <header className="site-editor-header">
      <Link href="/admin/site">← 公式HP編集</Link>
      <strong><BrandLogo /></strong>
      <Link href="/festmap" target="_blank">公開ページを見る ↗</Link>
    </header>
    <DesignEditor initial={readFestMapDesign(draft.data?.content ?? published.data?.content)} lastSaved={draft.data?.updated_at ?? null} lastPublished={published.data?.published_at ?? null} />
  </main>
}
