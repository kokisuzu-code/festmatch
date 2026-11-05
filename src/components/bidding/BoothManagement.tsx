'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { allocateBoothBids, bidFingerprint, type BoothBid, type BoothSpace, type GenreCap } from '@/lib/booth-bidding'
import { VENDOR_GENRES } from '@/lib/genres'
import { yen } from '@/lib/app'
import BoothMap from './BoothMap'
import styles from './bidding.module.css'

function draftId() { return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}` }

type EventConfig = { id: string; booth_bidding_enabled: boolean; booth_map_path: string | null; booth_config_version: number; booth_bidding_finalized_at: string | null; application_deadline_at: string | null; capacity: number | null; status: string }
export default function BoothManagement({ event, spaces: initialSpaces, slots: initialSlots, bids, mapUrl: initialMapUrl, names, mode, hasApplications }: { event: EventConfig; spaces: BoothSpace[]; slots: GenreCap[]; bids: BoothBid[]; mapUrl: string | null; names: Record<string, string>; mode: 'setup' | 'results'; hasApplications: boolean }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(event.booth_bidding_enabled)
  const [mapPath, setMapPath] = useState(event.booth_map_path)
  const [mapUrl, setMapUrl] = useState(initialMapUrl)
  const [spaces, setSpaces] = useState(initialSpaces)
  const [slots, setSlots] = useState<GenreCap[]>(initialSlots.length ? initialSlots : VENDOR_GENRES.map(genre => ({ genre, capacity: 0 })))
  const [focused, setFocused] = useState('')
  const [placing, setPlacing] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const frozen = bids.length > 0 || hasApplications || Boolean(event.booth_bidding_finalized_at)
  const url = `/api/booth-bidding/${event.id}`
  const preview = allocateBoothBids(bids, initialSpaces, initialSlots, event.capacity)
  const label = (id: string) => initialSpaces.find(space => space.id === id)?.label ?? '不明な区画'

  async function upload(file?: File) {
    if (!file) return
    setPending(true); setNotice('')
    try {
      const form = new FormData(); form.set('file', file)
      const response = await fetch(`${url}/map`, { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setMapPath(data.path); setMapUrl(data.url); setNotice('図面を読み込みました。区画位置を設定して保存してください。')
    } catch (error) { setNotice(error instanceof Error ? error.message : '画像を保存できませんでした。') }
    finally { setPending(false) }
  }
  async function save() {
    setPending(true); setNotice('')
    try {
      if (enabled && (!mapPath || !spaces.length)) throw new Error('区画図を添付し、図面上に区画を1つ以上追加してください。')
      const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: event.booth_config_version, enabled, mapPath, spaces: enabled ? spaces.map(({ label, genre, minimum_fee_yen, map_x, map_y }) => ({ label, genre, minimum_fee_yen, map_x, map_y })) : [], slots: enabled ? slots : [] }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setNotice('区画と募集条件を保存しました。'); router.refresh()
    } catch (error) { setNotice(error instanceof Error ? error.message : '保存できませんでした。') }
    finally { setPending(false) }
  }
  async function finalize() {
    setPending(true); setNotice('')
    try {
      const response = await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: confirmed, fingerprint: bidFingerprint(bids) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setNotice(`${data.approved}店舗の区画を確定しました。出店者の応募状況にも反映されます。`); router.refresh()
    } catch (error) { setNotice(error instanceof Error ? error.message : '割当を確定できませんでした。') }
    finally { setPending(false) }
  }
  function updateSpace(id: string, patch: Partial<BoothSpace>) { setSpaces(current => current.map(space => space.id === id ? { ...space, ...patch } : space)) }

  if (mode === 'results') return <section className="panel"><div className="section-heading"><div><p className="eyebrow">BOOTH BIDDING</p><h2>区画指定・入札応募</h2></div><Link href={`/organizer/events/${event.id}/edit#booth-bidding`}>区画図・募集条件を設定</Link></div>
    {!enabled ? <p className="panel-copy">区画図を添付し、最低額・募集ジャンル・区画位置を設定すると入札応募を利用できます。</p> : <>
    <div className={styles.notice}>提示額の高い順で希望区画を割り当てます。同額では、その金額を先に提示した応募を優先します。出店料は提示額で確定します。</div>
    <BoothMap url={mapUrl} spaces={initialSpaces} focused={focused} onSelect={setFocused} />
    <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>ジャンル</th><th>出店者</th><th>提示額</th><th>この金額を登録した日時</th><th>希望順位</th><th>{event.booth_bidding_finalized_at ? '確定結果' : '仮割当'}</th></tr></thead><tbody>{preview.map(bid => <tr key={bid.id}><td>{bid.genre}</td><td>{names[bid.vendor_id] ?? '出店者'}{bid.message && <p>{bid.message}</p>}</td><td>{yen(bid.amount_yen)}</td><td>{new Date(bid.amount_submitted_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td><td>{bid.preferences.map(label).join(' → ')}</td><td>{event.booth_bidding_finalized_at ? bid.status === 'awarded' ? initialSpaces.find(space => space.assigned_application_id === bid.application_id)?.label ?? '確定済み' : '補欠' : bid.spaceId ? label(bid.spaceId) : '補欠'}</td></tr>)}</tbody></table></div>
    {!bids.length && <p className={styles.empty}>入札応募はまだありません。</p>}
    <p className={styles.note}>応募締切：{event.application_deadline_at ? new Date(event.application_deadline_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '未設定'}（日本時間）</p>
    {event.booth_bidding_finalized_at ? <p className={styles.notice}>割当確定済みです。採択された出店者は下の正式応募一覧から確認できます。</p> : <><label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>締切後の最新の割当結果を確認しました。確定後は提示額・区画・選考順を変更できません。</span></label><div className={styles.toolbar}><button className="button button-primary" disabled={pending || !confirmed || !bids.length || !event.application_deadline_at || Date.now()<Date.parse(event.application_deadline_at)} onClick={finalize} aria-busy={pending}>{pending ? '確定中…' : 'この割当で出店を確定する'}</button><button className="button button-secondary" disabled={pending} onClick={() => router.refresh()}>最新の応募で再計算</button></div></>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}</>}
  </section>

  return <section id="booth-bidding" className="panel"><div className="section-heading"><div><p className="eyebrow">BOOTH APPLICATION SETUP</p><h2>区画図・入札応募の設定</h2></div></div><label className={styles.check}><input type="checkbox" checked={enabled} disabled={pending || frozen} onChange={e => setEnabled(e.target.checked)} /><span>区画指定・入札形式で募集する</span></label><p className={styles.note}>区画図の添付・応募締切・区画ごとの最低額・ジャンル・位置が必須です。応募受付後は募集条件を固定します。</p>
  {frozen && <p className={styles.notice}>応募受付後のため募集条件は変更できません。割当結果はイベント詳細から確認できます。</p>}
  {enabled && <div className={styles.setupGrid}><div><div className={styles.upload}><strong>{mapPath ? '✓ 区画図を添付済み' : '区画図を添付（必須）'}</strong><input aria-label="区画図の画像" type="file" accept="image/png,image/jpeg,image/webp" disabled={pending || frozen} onChange={e => upload(e.target.files?.[0])} /><p>PNG・JPEG・WebP、8MB以下。PDFは画像に書き出して添付してください。</p></div>
  <div className={styles.toolbar}><button type="button" className="button button-secondary" disabled={pending || frozen || !mapUrl} onClick={() => { setMovingId(null); setPlacing(!placing) }}>{placing ? '配置モードを終了' : '＋ 図面を押して区画を追加'}</button><button type="button" className="button button-secondary" disabled={pending || frozen || !mapUrl} onClick={() => { const id = draftId(); setSpaces(current => [...current,{ id, label: `区画${current.length+1}`, genre: slots[0]?.genre ?? VENDOR_GENRES[0], minimum_fee_yen: 20000, map_x:50, map_y:50 }]); setFocused(id) }}>中央に区画を追加</button>{placing && <span className={styles.note}>区画の中心をクリックしてください。</span>}</div>
  <BoothMap url={mapUrl} spaces={spaces} focused={focused} onSelect={setFocused} onPlace={placing && !frozen && !pending ? (x,y) => { if (movingId) { updateSpace(movingId,{map_x:x,map_y:y}); setMovingId(null); setPlacing(false); return } const id = draftId(); setSpaces(current => [...current,{ id, label: `区画${current.length+1}`, genre: slots[0]?.genre ?? VENDOR_GENRES[0], minimum_fee_yen: 20000, map_x:x, map_y:y }]); setFocused(id); setPlacing(false) } : undefined} />
  <p className={styles.note}>番号を選んでから「位置を移動」を押すと、図面上で位置を変更できます。</p>
  {spaces.map(space => <div key={space.id} className={styles.spaceRow} style={space.id === focused ? { borderColor: '#176145' } : undefined}><label>区画番号<input value={space.label} maxLength={80} disabled={pending || frozen} onChange={e => updateSpace(space.id,{ label:e.target.value })} /></label><label>募集ジャンル<select value={space.genre ?? ''} disabled={pending || frozen} onChange={e => updateSpace(space.id,{ genre:e.target.value })}><option value="">選択してください</option>{slots.map(slot => <option key={slot.genre}>{slot.genre}</option>)}</select></label><label>最低出店料（税込）<input type="number" min="1000" max="1000000" step="1000" value={space.minimum_fee_yen} disabled={pending || frozen} onChange={e => updateSpace(space.id,{ minimum_fee_yen:Number(e.target.value) })} /></label><label>横位置（%）<input type="number" min="0" max="100" step="0.01" value={space.map_x ?? 50} disabled={pending || frozen} onChange={e => updateSpace(space.id,{map_x:Number(e.target.value)})} /></label><label>縦位置（%）<input type="number" min="0" max="100" step="0.01" value={space.map_y ?? 50} disabled={pending || frozen} onChange={e => updateSpace(space.id,{map_y:Number(e.target.value)})} /></label><button type="button" disabled={pending || frozen} onClick={() => { setFocused(space.id); setPlacing(false) }}>図面で確認</button><button type="button" disabled={pending || frozen} onClick={() => { setFocused(space.id); setMovingId(space.id); setPlacing(true); setNotice(`図面上の新しい位置を押してください。${space.label}を移動します。`) }}>位置を移動</button><button type="button" disabled={pending || frozen} onClick={() => setSpaces(current => current.filter(item => item.id!==space.id))}>削除</button></div>)}
  </div><div><h3>ジャンル別の採択上限</h3><p className={styles.note}>0店舗は募集なし。上限の合計はイベント全体の募集枠以下に設定してください。</p>{slots.map((slot,index) => <label className={styles.capRow} key={slot.genre}><span>{slot.genre}</span><input type="number" min="0" max="1000" step="1" disabled={pending || frozen} value={slot.capacity} onChange={e => setSlots(current => current.map((item,i) => i===index ? { ...item, capacity:Number(e.target.value) } : item))} /></label>)}<p className={styles.notice}>最高提示額を出店者画面に公開します。店舗名と他店の個別応募内容は出店者に公開しません。</p></div></div>}
  <button className="button button-primary" disabled={pending || frozen} onClick={save} aria-busy={pending}>{pending ? '保存中…' : '区画図・募集条件を保存'}</button>{notice && <p className={styles.notice} role="status">{notice}</p>}
  </section>
}
