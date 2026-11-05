import Link from 'next/link'
import { requireSiteEditor } from '@/lib/site/server'
import './site/site-editor.css'

export const metadata = { title: 'FestMatch 運営管理', robots: { index: false, follow: false } }

export default async function InternalAdminPage() {
  await requireSiteEditor()
  return <main className="site-editor-page">
    <header className="site-editor-header"><Link href="/home">← 公式HPを見る</Link><strong>FestMatch <span>運営管理</span></strong><form action="/auth/signout" method="post"><button type="submit">ログアウト</button></form></header>
    <div className="site-editor-shell"><div className="site-editor-intro"><div><span className="site-editor-kicker">FESTMATCH OPERATIONS</span><h1>運営管理</h1><p>公式HPの内容を編集・確認・公開できます。</p></div></div><section className="site-editor-panel site-admin-card"><span className="site-editor-kicker">WEBSITE</span><h2>公式HPの編集</h2><p>見出し・写真・紹介文・お知らせを更新します。下書きをプレビューしてから公開できます。</p><Link href="/admin/site">編集画面を開く ↗</Link></section></div>
  </main>
}
