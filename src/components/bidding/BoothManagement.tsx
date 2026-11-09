'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { allocateBoothBids, bidFingerprint, type BoothBid, type BoothSpace, type GenreCap } from '@/lib/booth-bidding'
import { completeGenreSlots } from '@/lib/genres'
import { yen } from '@/lib/app'
import BoothMap from './BoothMap'
import BoothLayoutEditor from './BoothLayoutEditor'
import styles from './bidding.module.css'


type EventConfig = { id: string; booth_bidding_enabled: boolean; booth_map_path: string | null; booth_config_version: number; booth_bidding_finalized_at: string | null; application_deadline_at: string | null; capacity: number | null; status: string; booth_fee_yen?: number }
export default function BoothManagement({ event, spaces: initialSpaces, slots: initialSlots, bids, mapUrl: initialMapUrl, names, mode, hasApplications, aiEnabled = false }: { event: EventConfig; spaces: BoothSpace[]; slots: GenreCap[]; bids: BoothBid[]; mapUrl: string | null; names: Record<string, string>; mode: 'setup' | 'results'; hasApplications: boolean; aiEnabled?: boolean }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(event.booth_bidding_enabled)
  const [mapPath, setMapPath] = useState(event.booth_map_path)
  const [mapUrl, setMapUrl] = useState(initialMapUrl)
  const [spaces, setSpaces] = useState(initialSpaces.map(space => ({...space,minimum_fee_yen:space.minimum_fee_yen || Math.max(1000,Math.ceil((event.booth_fee_yen ?? 33000)/1000)*1000)})))
  const [slots, setSlots] = useState<GenreCap[]>(completeGenreSlots(initialSlots))
  const [focused, setFocused] = useState('')
  const [genreEnabled, setGenreEnabled] = useState(initialSlots.length > 0)
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
      const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: event.booth_config_version, enabled, mapPath, spaces: spaces.map(({ label, genre, minimum_fee_yen, map_x, map_y, map_width, map_height }) => ({ label, genre:genreEnabled ? genre : null, minimum_fee_yen, map_x, map_y, map_width, map_height })), slots: genreEnabled ? slots : [] }) })
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

  if (mode === 'results') return <section className="panel"><div className="section-heading"><div><h2>区画指定・入札応募</h2></div><Link href={`/organizer/events/${event.id}/edit#booth-bidding`}>区画図・募集条件を設定</Link></div>
    {!enabled ? <p className="panel-copy">区画図を添付し、最低額・募集ジャンル・区画位置を設定すると入札応募を利用できます。</p> : <>
    <div className={styles.notice}>提示額の高い順で希望区画を割り当てます。同額では、その金額を先に提示した応募を優先します。出店料は提示額で確定します。</div>
    <BoothMap url={mapUrl} spaces={initialSpaces} focused={focused} onSelect={setFocused} />
    <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>ジャンル</th><th>出店者</th><th>提示額</th><th>この金額を登録した日時</th><th>希望順位</th><th>{event.booth_bidding_finalized_at ? '確定結果' : '仮割当'}</th></tr></thead><tbody>{preview.map(bid => <tr key={bid.id}><td>{bid.genre}</td><td>{names[bid.vendor_id] ?? '出店者'}{bid.message && <p>{bid.message}</p>}</td><td>{yen(bid.amount_yen)}</td><td>{new Date(bid.amount_submitted_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td><td>{bid.preferences.map(label).join(' → ')}</td><td>{event.booth_bidding_finalized_at ? bid.status === 'awarded' ? initialSpaces.find(space => space.assigned_application_id === bid.application_id)?.label ?? '確定済み' : '補欠' : bid.spaceId ? label(bid.spaceId) : '補欠'}</td></tr>)}</tbody></table></div>
    {!bids.length && <p className={styles.empty}>入札応募はまだありません。</p>}
    <p className={styles.note}>応募締切：{event.application_deadline_at ? new Date(event.application_deadline_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '未設定'}（日本時間）</p>
    {event.booth_bidding_finalized_at ? <p className={styles.notice}>割当確定済みです。採択された出店者は下の正式応募一覧から確認できます。</p> : <><label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>締切後の最新の割当結果を確認しました。確定後は提示額・区画・選考順を変更できません。</span></label><div className={styles.toolbar}><button type="button" className="button button-primary" disabled={pending || !confirmed || !bids.length || !event.application_deadline_at || Date.now()<Date.parse(event.application_deadline_at)} onClick={finalize} aria-busy={pending}>{pending ? '確定中…' : 'この割当で出店を確定する'}</button><button type="button" className="button button-secondary" disabled={pending} onClick={() => router.refresh()}>最新の応募で再計算</button></div></>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}</>}
  </section>

  return <section id="booth-bidding" className="panel"><div className="section-heading"><h2>募集設定</h2></div>
    <label className={styles.check}><input type="checkbox" checked={enabled} disabled={pending || frozen} onChange={e => setEnabled(e.target.checked)} /><span>区画指定・提示額での募集を利用する</span></label>
    <p className={styles.note}>オフなら固定の出店料で募集します。区画図はどちらの募集方法でも添付できます。</p>
    {frozen && <p className={styles.notice}>応募済みの出店者がいるため、区画・募集条件は固定しています。イベントの画像・説明・案内は上で編集できます。</p>}
    <label className={styles.check}><input type="checkbox" checked={genreEnabled} disabled={pending || frozen} onChange={e => setGenreEnabled(e.target.checked)} /><span>ジャンル別に募集枠を設定する（任意）</span></label>
    {genreEnabled && <div><h3>ジャンルごとの採択上限</h3><p className={styles.note}>0店舗は募集なし。上限の合計は全体の募集台数以下に設定してください。</p>{slots.map((slot,index) => <label className={styles.capRow} key={slot.genre}><span>{slot.genre}</span><input type="number" min="0" max="1000" disabled={pending || frozen} value={slot.capacity} onChange={e => setSlots(current => current.map((item,i) => i===index ? {...item,capacity:Number(e.target.value)} : item))} /></label>)}</div>}
    <div className={styles.upload}><strong>{mapPath ? '区画図を添付済み' : `区画図を添付（${enabled ? '必須' : '任意'}）`}</strong><input aria-label="区画図の画像" type="file" accept="image/png,image/jpeg,image/webp" disabled={pending || frozen} onChange={e => upload(e.target.files?.[0])} /><p>PNG・JPEG・WebP、8MB以下。</p></div>
    <BoothLayoutEditor spaces={spaces} onChange={setSpaces} mapUrl={mapUrl} genreEnabled={genreEnabled} defaultFee={Math.max(1000,Math.ceil((event.booth_fee_yen ?? 33000)/1000)*1000)} disabled={pending || frozen} eventId={event.id} aiEnabled={aiEnabled} />
    <button type="button" className="button button-primary" disabled={pending || frozen} onClick={save} aria-busy={pending}>{pending ? '保存中…' : '募集設定・区画図を保存'}</button>{notice && <p className={styles.notice} role="status">{notice}</p>}
  </section>
}
