'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { publishSite, saveSiteDraft, uploadSiteImage } from './actions'
import type { SiteContent } from '@/lib/site/content'

export default function SiteEditor({ initial, lastSaved, lastPublished }: { initial: SiteContent; lastSaved: string | null; lastPublished: string | null }) {
  const [content, setContent] = useState(initial)
  const [tab, setTab] = useState<'top' | 'about' | 'news'>('top')
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const revision = useRef(0)
  const update = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => { revision.current += 1; setContent(previous => ({ ...previous, [key]: value })); setDirty(true); setMessage('') }
  const run = (action: 'save' | 'publish') => {
    const savedRevision = revision.current
    startTransition(async () => {
    try {
      if (action === 'save') await saveSiteDraft(content)
      else await publishSite(content)
      if (savedRevision === revision.current) setDirty(false)
      setMessage(action === 'save' ? '下書きを保存しました。プレビューで確認できます。' : '公式HPに公開しました。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存できませんでした。入力内容をご確認ください。') }
    })
  }
  const upload = (file?: File) => {
    if (!file) return
    startTransition(async () => {
      try {
        const data = new FormData()
        data.append('file', file)
        update('heroImage', await uploadSiteImage(data))
        setMessage('写真をアップロードしました。下書きを保存するとプレビューに反映されます。')
      } catch (error) { setMessage(error instanceof Error ? error.message : '写真をアップロードできませんでした。') }
    })
  }
  const field = (key: Exclude<keyof SiteContent, 'news'>, label: string, multiline = false) => <label className="site-editor-field" key={key}><span>{label}</span>{multiline ? <textarea value={content[key]} onChange={event => update(key, event.target.value)} rows={4} maxLength={key === 'lead' ? 260 : 400} /> : <input value={content[key]} onChange={event => update(key, event.target.value)} maxLength={key === 'heroImage' ? 500 : 100} />}</label>
  return <div className="site-editor-shell">
    <div className="site-editor-intro"><div><span className="site-editor-kicker">WEBSITE STUDIO</span><h1>公式HPを、あなたの言葉で。</h1><p>文章や写真、お知らせを編集できます。まず下書きを保存し、全体を確認してから公開してください。</p></div><div className="site-editor-status"><span>{dirty ? '● 未保存の変更あり' : '✓ 保存済み'}</span><small>最終公開 {lastPublished ? new Date(lastPublished).toLocaleString('ja-JP') : '未公開（初期デザインを表示中）'}</small>{lastSaved && <small>下書き {new Date(lastSaved).toLocaleString('ja-JP')}</small>}</div></div>
    <div className="site-editor-grid"><section className="site-editor-panel" aria-label="編集項目">
      <div className="site-editor-tabs" role="tablist" aria-label="編集する内容">{([['top', 'トップ'], ['about', '紹介・強み'], ['news', 'お知らせ']] as const).map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>{label}</button>)}</div>
      {tab === 'top' && <div className="site-editor-fields"><h2>最初に見えるエリア</h2><p>訪問者に伝えたいことを短く書くと読みやすくなります。</p>{field('eyebrow', '小さな見出し')}{field('headline', 'メイン見出し')}{field('lead', '紹介文', true)}<div className="site-editor-field"><span>メイン写真</span><div className="site-editor-image"><Image src={content.heroImage} alt={content.heroAlt} width={640} height={360} unoptimized={content.heroImage.startsWith('https:')} /><button type="button" disabled={pending} onClick={() => fileInput.current?.click()}>写真を選ぶ</button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { upload(event.target.files?.[0]); event.currentTarget.value = '' }} /></div><small>JPEG・PNG・WebP、5MB以下。権利のある写真を使用してください。</small></div>{field('heroAlt', '写真の説明（読み上げ用）')}</div>}
      {tab === 'about' && <div className="site-editor-fields"><h2>FestMatchについて</h2><p>サービスの特徴を紹介します。</p>{field('aboutTitle', 'セクション見出し')}{field('aboutText', '紹介文', true)}{field('featureOneTitle', '特徴 1 の見出し')}{field('featureOneText', '特徴 1 の説明', true)}{field('featureTwoTitle', '特徴 2 の見出し')}{field('featureTwoText', '特徴 2 の説明', true)}</div>}
      {tab === 'news' && <div className="site-editor-fields"><h2>お知らせ</h2><p>公開するとトップに掲載されます。新しい順で表示します。</p>{content.news.map((item, index) => <div className="site-editor-news" key={index}><div><strong>お知らせ {index + 1}</strong><button type="button" onClick={() => update('news', content.news.filter((_, i) => i !== index))}>削除</button></div><label className="site-editor-field"><span>日付</span><input type="date" value={item.date} onChange={e => update('news', content.news.map((n, i) => i === index ? { ...n, date: e.target.value } : n))} /></label><label className="site-editor-field"><span>タイトル</span><input value={item.title} maxLength={100} onChange={e => update('news', content.news.map((n, i) => i === index ? { ...n, title: e.target.value } : n))} /></label><label className="site-editor-field"><span>本文</span><textarea value={item.body} maxLength={1000} rows={4} onChange={e => update('news', content.news.map((n, i) => i === index ? { ...n, body: e.target.value } : n))} /></label></div>)}<button type="button" className="site-editor-add" disabled={content.news.length >= 8} onClick={() => update('news', [{ title: '', body: '', date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }) }, ...content.news])}>＋ お知らせを追加</button></div>}
    </section><aside className="site-editor-preview"><div className="site-editor-preview-title"><span>LIVE PREVIEW</span><strong>編集中の見え方</strong></div><div className="site-editor-mini"><div className="site-editor-mini-photo"><Image src={content.heroImage} alt="" fill sizes="(max-width: 900px) 100vw, 400px" unoptimized={content.heroImage.startsWith('https:')} /></div><div className="site-editor-mini-copy"><small>FESTMATCH / DISCOVER YOUR WEEKEND</small><p>{content.eyebrow}</p><h2>{content.headline}</h2><span>{content.lead}</span><b>イベントを探す ↗</b></div></div><div className="site-editor-mini-about"><small>ABOUT FESTMATCH</small><strong>{content.aboutTitle}</strong><p>{content.aboutText}</p></div><p className="site-editor-preview-note">画面右側は簡易プレビューです。保存後に「全体をプレビュー」で実際のページを確認できます。</p><a href="/admin/site/preview" target="_blank" rel="noopener noreferrer" className="site-editor-full-preview">全体をプレビュー ↗</a></aside></div>
    <div className="site-editor-actions"><p role="status">{message || (dirty ? '変更内容はまだ公開されていません。' : '下書きを保存してから公開できます。')}</p><div><button type="button" className="site-editor-save" onClick={() => run('save')} disabled={pending}>{pending ? '処理中…' : '下書きを保存'}</button><button type="button" className="site-editor-publish" onClick={() => run('publish')} disabled={pending}>{pending ? '処理中…' : '公式HPに公開'}</button></div></div>
  </div>
}
