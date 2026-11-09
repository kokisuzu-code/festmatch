'use client'

import { useState } from 'react'
import type { BoothSpace } from '@/lib/booth-bidding'
import { VENDOR_GENRES } from '@/lib/genres'
import BoothMap from './BoothMap'
import styles from './bidding.module.css'
import { parseBoothImport } from '@/lib/booth-layout'

export default function BoothLayoutEditor({ spaces, onChange, mapUrl, genreEnabled, defaultFee = 33000, disabled = false, eventId, aiEnabled = false }: {
  spaces: BoothSpace[]; onChange: (spaces: BoothSpace[]) => void; mapUrl: string | null;
  genreEnabled: boolean; defaultFee?: number; disabled?: boolean; eventId?: string; aiEnabled?: boolean;
}) {
  const [focused, setFocused] = useState('')
  const [adding, setAdding] = useState(false)
  const [history, setHistory] = useState<BoothSpace[][]>([])
  const [importText, setImportText] = useState('')
  const [notice, setNotice] = useState('')
  const [reading, setReading] = useState(false)
  const selected = spaces.find(space => space.id === focused)
  function change(next: BoothSpace[]) { setHistory(current => [...current.slice(-19), spaces]); onChange(next) }
  function update(id: string, patch: Partial<BoothSpace>) { change(spaces.map(space => space.id === id ? { ...space, ...patch } : space)) }
  function add(x: number, y: number) {
    if (spaces.length >= 100) { setNotice('区画は100件まで追加できます。'); return }
    const id = crypto.randomUUID()
    let n = spaces.length + 1
    while (spaces.some(space => space.label === `区画${n}`)) n++
    change([...spaces, { id, label: `区画${n}`, genre: genreEnabled ? VENDOR_GENRES[0] : null, minimum_fee_yen: defaultFee, map_x: x, map_y: y, map_width: 7, map_height: 7 }])
    setFocused(id); setAdding(false)
  }
  function importResult(value: unknown) {
    const result = parseBoothImport(value, defaultFee, genreEnabled)
    change(result); setFocused(result[0]?.id ?? ''); setNotice(`${result.length}区画を取り込みました。図面と照合し、位置・番号を確認してください。`)
  }
  async function readMap() {
    setReading(true); setNotice('')
    try {
      const response = await fetch(`/api/booth-bidding/${eventId}/read-map`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mapUrl }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      importResult(data)
    } catch (error) { setNotice(error instanceof Error ? error.message : '読み取れませんでした。') }
    finally { setReading(false) }
  }
  return <div className={styles.layoutEditor}>
    <div className={styles.toolbar}><button type="button" className="button button-secondary" disabled={disabled || !mapUrl} onClick={() => setAdding(!adding)}>{adding ? '追加を終了' : '＋ 図面を押して追加'}</button><button type="button" className="button button-secondary" disabled={disabled || !history.length} onClick={() => { const previous = history.at(-1); if (previous) onChange(previous); setHistory(current => current.slice(0,-1)) }}>元に戻す</button>{eventId && aiEnabled && <button type="button" className="button button-secondary" disabled={disabled || reading || !mapUrl} onClick={readMap}>{reading ? '区画を読み取り中…' : 'AIで区画を読み取る'}</button>}</div>
    <p className={styles.note}>{adding ? '追加する区画の中心を押してください。' : '区画をつかんで移動できます。番号を選択すると下で編集できます。キーボードの矢印キーでも移動できます。'}</p>
    <BoothMap url={mapUrl} spaces={spaces} focused={focused} onSelect={setFocused} onPlace={adding && !disabled ? add : undefined} onMove={!disabled ? (id,x,y) => update(id,{ map_x:x,map_y:y }) : undefined} />
    <div className={styles.toolbar}>{spaces.map(space => <button className="button button-secondary" type="button" key={space.id} aria-pressed={focused === space.id} onClick={() => setFocused(space.id)}>{space.label}</button>)}</div>
    {selected && <fieldset className={styles.selectedEditor} disabled={disabled}><legend>{selected.label}を編集</legend><label>区画番号<input maxLength={80} value={selected.label} onChange={e => update(selected.id,{ label:e.target.value })} /></label>{genreEnabled && <label>募集ジャンル<select value={selected.genre ?? ''} onChange={e => update(selected.id,{ genre:e.target.value || null })}><option value="">全ジャンル可</option>{VENDOR_GENRES.map(genre => <option key={genre}>{genre}</option>)}</select></label>}<label>最低出店料（税込）<input type="number" min="1000" max="1000000" step="1000" value={selected.minimum_fee_yen} onChange={e => update(selected.id,{minimum_fee_yen:Number(e.target.value)})} /></label><label>区画の横幅<input aria-label="区画の横幅" type="range" min="2" max="25" value={selected.map_width ?? 7} onChange={e => update(selected.id,{map_width:Number(e.target.value)})} /></label><label>区画の高さ<input aria-label="区画の高さ" type="range" min="2" max="25" value={selected.map_height ?? 7} onChange={e => update(selected.id,{map_height:Number(e.target.value)})} /></label><button type="button" className="button button-secondary" onClick={() => change(spaces.filter(space => space.id !== selected.id))}>この区画を削除</button></fieldset>}
    <details className={styles.importBox}><summary>ChatGPTで読み取った区画を取り込む</summary><p className={styles.note}>区画図をChatGPTに添付し、下の依頼文で読み取った結果を貼り付けてください。取り込み後は必ず図面と照合してください。</p><pre>この区画図の出店区画だけを読み取り、JSONのみで返してください。形式：{`{"spaces":[{"label":"A1","map_x":20,"map_y":30,"map_width":7,"map_height":7}]}`}。位置は画像左上を0、右下を100とした区画中心。客席・通路・本部は除外し、判読できない区画は推測で追加しないでください。</pre><label>読み取り結果<textarea rows={5} maxLength={50000} value={importText} disabled={disabled} onChange={e => setImportText(e.target.value)} /></label><button className="button button-secondary" type="button" disabled={disabled || !importText.trim()} onClick={() => { try { importResult(JSON.parse(importText.replace(/^```(?:json)?\s*|\s*```$/g,''))) } catch(error) { setNotice(error instanceof Error ? error.message : '読み取り結果の形式を確認してください。') } }}>区画を取り込む（現在の配置を置換）</button></details>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </div>
}
