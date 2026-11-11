'use client'

import { useState, useTransition } from 'react'
import DirectoryHeader from '@/components/festmap/DirectoryHeader'
import { sizeLimits, type FestMapDesign } from '@/lib/site/festmap-design'
import { saveFestMapDesign } from './actions'
import styles from './editor.module.css'

const sections = { eyebrow: '上部ラベル', title: 'メイン見出し', description: '説明文', search: '検索欄' }
type Section = keyof typeof sections
type Props = { initial: FestMapDesign; lastSaved: string | null; lastPublished: string | null }

export default function DesignEditor({ initial, lastSaved, lastPublished }: Props) {
  const [design, setDesign] = useState(initial)
  const [section, setSection] = useState<Section>('title')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [version, setVersion] = useState(lastSaved)
  const [published, setPublished] = useState(lastPublished)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const current = design[section]
  const [min, max] = sizeLimits[section]

  function change<K extends Section>(key: K, patch: Partial<FestMapDesign[K]>) {
    setDesign(previous => ({ ...previous, [key]: { ...previous[key], ...patch } }))
    setDirty(true)
    setMessage('')
  }

  function save(publish: boolean) {
    startTransition(async () => {
      try {
        const result = await saveFestMapDesign(design, version, publish)
        if ('error' in result) { setMessage(result.error ?? '保存できませんでした。'); return }
        setVersion(result.savedAt)
        setDesign(result.design)
        setDirty(false)
        if (publish) setPublished(result.savedAt)
        setMessage(publish ? 'FestMapに公開しました。' : '下書きを保存しました。')
      } catch { setMessage('通信に失敗しました。もう一度お試しください。') }
    })
  }

  return <div className="site-editor-shell">
    <div className="site-editor-intro"><div><h1>FestMapのデザイン編集</h1><p>イベント一覧の上部を編集できます。公開すると全国版と都道府県別ページに反映されます。</p></div></div>
    <section className={styles.preview} aria-label="ライブプレビュー">
      <div className={styles.toolbar}><h2>プレビュー</h2><div className={styles.switcher}>
        {(['desktop', 'mobile'] as const).map(id => <button key={id} type="button" aria-pressed={device === id} onClick={() => setDevice(id)}>{id === 'desktop' ? 'PC' : 'スマホ'}</button>)}
      </div></div>
      <div className={styles.viewport}><div className={device === 'mobile' ? styles.phone : styles.desktop} inert>
        <DirectoryHeader design={design} />
      </div></div>
    </section>
    <section className="site-editor-panel" aria-label="編集項目">
      <div className="site-editor-tabs">{(Object.entries(sections) as [Section, string][]).map(([id, label]) =>
        <button key={id} type="button" className={section === id ? 'active' : ''} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>)}</div>
      <fieldset className={styles.fields} disabled={pending}>
        <legend>{sections[section]}</legend>
        {section === 'search' ? <div className={styles.searchLabels}>
          {([['placeholder', '検索欄の案内文'], ['allPrefectures', '全国選択の表示名'], ['button', 'ボタンの文言']] as const).map(([key, label]) =>
            <label className="site-editor-field" key={key}><span>{label}</span><input value={design.search[key]} maxLength={key === 'button' ? 20 : 100} onChange={e => change('search', { [key]: e.target.value })} /></label>)}
        </div> : <label className="site-editor-field"><span>{section === 'title' ? '全国版の見出し' : '表示する文章'}</span>
          <textarea rows={section === 'description' ? 3 : 1} maxLength={section === 'description' ? 400 : 100} value={design[section].text} onChange={e => change(section, { text: e.target.value })} />
          {section === 'title' && <small>都道府県別ページでは「神奈川県のイベント」のように地域名が入ります。</small>}
        </label>}
        <div className={styles.controls}>
          {(['desktop', 'mobile'] as const).map(id => <label key={id}><span>{id === 'desktop' ? 'PC' : 'スマホ'}の文字サイズ <b>{current[id]} px</b></span>
            <input type="range" min={min} max={max} value={current[id]} onChange={e => { setDevice(id); change(section, { [id]: Number(e.target.value) }) }} /></label>)}
          <label><span>{section === 'search' ? '入力文字の色' : '文字色'}</span><input type="color" value={current.color} onChange={e => change(section, { color: e.target.value })} /></label>
          {section === 'search' && <label><span>ボタンの背景色</span><input type="color" value={design.search.buttonBackground} onChange={e => change('search', { buttonBackground: e.target.value })} /></label>}
        </div>
      </fieldset>
    </section>
    <div className="site-editor-actions"><p role="status">{message || (dirty ? '未保存の変更があります。' : published ? '最終公開 ' + new Date(published).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '公開ページは初期デザインです。')}</p><div>
      <button type="button" className="site-editor-save" disabled={pending || !dirty} onClick={() => save(false)}>下書きを保存</button>
      <button type="button" className="site-editor-publish" disabled={pending} onClick={() => save(true)}>{pending ? '保存中…' : 'FestMapに公開'}</button>
    </div></div>
  </div>
}
