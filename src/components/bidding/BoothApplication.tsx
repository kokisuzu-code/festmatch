'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { BoothBid, BoothSpace, GenreCap } from '@/lib/booth-bidding'
import { yen } from '@/lib/app'
import BoothMap from './BoothMap'
import styles from './bidding.module.css'

export default function BoothApplication({ eventId, mapUrl, spaces, maximums: initialMaximums, mine: initialMine, genre, slots, deadline, finalizedAt }: { eventId: string; mapUrl: string | null; spaces: BoothSpace[]; maximums: Record<string, number>; mine: BoothBid | null; genre: string; slots: GenreCap[]; deadline: string | null; finalizedAt: string | null }) {
  const [mine, setMine] = useState(initialMine)
  const [preferences, setPreferences] = useState<string[]>(initialMine?.preferences ?? [])
  const [amount, setAmount] = useState(String(initialMine?.amount_yen ?? 35000))
  const [message, setMessage] = useState(initialMine?.message ?? '')
  const [maximums, setMaximums] = useState(initialMaximums)
  const [focus, setFocus] = useState(initialMine?.preferences[0] ?? spaces.find(space => !space.genre || space.genre === genre)?.id ?? spaces[0]?.id ?? '')
  const [accepted, setAccepted] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [stale, setStale] = useState(false)
  const [finalized, setFinalized] = useState(finalizedAt)
  const [now, setNow] = useState(Date.now())
  const versionRef = useRef(initialMine?.version ?? 0)
  const bidGenre = mine?.genre ?? genre
  const cap = (slots.length ? slots.find(slot => slot.genre === bidGenre)?.capacity ?? 0 : Infinity)
  const closed = !deadline || now >= Date.parse(deadline) || Boolean(finalized)
  const chosen = spaces.find(space => space.id === focus)

  useEffect(() => {
    let active = true
    async function refresh() {
      setNow(Date.now())
      try {
        const response = await fetch(`/api/booth-bidding/${eventId}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (!active) return
        setMaximums(data.maximums); setFinalized(data.finalizedAt)
        if ((data.mine?.version ?? 0) !== versionRef.current) setStale(true)
      } catch { /* The submit endpoint validates against current database state. */ }
    }
    const interval = setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [eventId])

  function toggle(id: string) {
    setNotice(''); setAccepted(false)
    setPreferences(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 3 ? [...current, id] : current)
  }
  function move(index: number, delta: number) {
    setPreferences(current => { const next = [...current]; [next[index], next[index+delta]] = [next[index+delta], next[index]]; return next })
    setAccepted(false)
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setNotice('')
    try {
      const response = await fetch(`/api/booth-bidding/${eventId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: Number(amount), preferences, message, version: versionRef.current, accepted }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? '応募を送信できませんでした。')
      versionRef.current = data.bid.version; setMine(data.bid); setAccepted(false)
      setNotice('応募条件を保存しました。締切までは増額・希望順位の変更ができます。')
      const latest = await fetch(`/api/booth-bidding/${eventId}`, { cache: 'no-store' })
      if (latest.ok) setMaximums((await latest.json()).maximums)
    } catch (error) { setNotice(error instanceof Error ? error.message : '通信に失敗しました。再度お試しください。') }
    finally { setPending(false) }
  }

  return <div className={styles.layout}>
    <div><section className={styles.card}><div className={styles.heading}><div><p className="eyebrow">VENUE MAP</p><h2>区画図から希望の場所を選択</h2></div><span>{spaces.length}区画</span></div><BoothMap url={mapUrl} spaces={spaces} selected={preferences} focused={focus} onSelect={setFocus} /><p className={styles.note}>金色は希望に追加した区画です。現在の最高提示額は15秒ごと・画面に戻った際に更新されます。</p></section>
    <section className={styles.card}><div className={styles.heading}><h2>募集区画・最高提示額</h2><span>あなたの応募ジャンル：{bidGenre}</span></div><div className={styles.spaceGrid}>{spaces.map(space => <button type="button" key={space.id} className={`${styles.spaceCard} ${focus === space.id ? styles.activeCard : ''}`} onClick={() => setFocus(space.id)}><strong>{space.label}</strong><small>{space.genre || '全ジャンル可'}</small><small>最低出店料 {yen(space.minimum_fee_yen)}</small><small>現在の最高提示額</small><b>{maximums[space.id] ? yen(maximums[space.id]) : '応募なし'}</b>{preferences.includes(space.id) && <span>第{preferences.indexOf(space.id)+1}希望</span>}</button>)}</div></section></div>
    <aside><section className={`${styles.card} ${styles.pad}`}>{chosen ? <><p className="eyebrow">SELECTED BOOTH</p><h2>{chosen.label}区画</h2><p>{chosen.genre || '全ジャンル可'}</p><div className={styles.metrics}><div><small>最低出店料</small><strong>{yen(chosen.minimum_fee_yen)}</strong></div><div><small>現在の最高提示額</small><strong>{maximums[chosen.id] ? yen(maximums[chosen.id]) : '応募なし'}</strong></div></div><button className="button button-primary" type="button" disabled={pending || closed || (chosen.genre && chosen.genre !== bidGenre) || (!preferences.includes(chosen.id) && preferences.length >= 3)} onClick={() => toggle(chosen.id)}>{preferences.includes(chosen.id) ? '希望から外す' : (chosen.genre && chosen.genre !== bidGenre) ? '応募ジャンルが異なります' : '希望区画に追加'}</button></> : <p>募集区画がまだ設定されていません。</p>}</section>
    <form onSubmit={submit} className={`${styles.card} ${styles.pad}`}><p className="eyebrow">YOUR APPLICATION</p><h2>{mine ? '応募条件の確認・増額' : '希望条件を登録する'}</h2><p className={styles.note}>締切：{deadline ? new Date(deadline).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '未設定'}（日本時間）</p>{closed && <p className={styles.notice}>{finalized ? '割当は確定しました。応募状況から結果を確認してください。' : '受付は終了しました。主催者の割当確定をお待ちください。'}</p>}{!cap && <p className={styles.notice}>このジャンルは募集していません。プロフィールのジャンルも確認してください。</p>}
    <label className="field">支払う最高提示額（税込・1区画）<input type="number" min={mine?.amount_yen ?? 1000} max="1000000" step="1000" value={amount} disabled={pending || closed} required onChange={event => { setAmount(event.target.value); setAccepted(false) }} /></label><p className={styles.note}>割当時の出店料は提示額です。区画の最低額を満たす金額を1,000円単位で設定してください。応募後の引き下げはできません。</p>
    <h3>希望順位（最大3区画）</h3><ol className={styles.preferenceList}>{preferences.map((id,index) => <li key={id}><span className={styles.rank}>{index+1}</span><span>{spaces.find(space => space.id === id)?.label ?? '削除された区画'}</span><div><button type="button" aria-label={`第${index+1}希望を上へ`} disabled={index===0 || pending || closed} onClick={() => move(index,-1)}>↑</button><button type="button" aria-label={`第${index+1}希望を下へ`} disabled={index===preferences.length-1 || pending || closed} onClick={() => move(index,1)}>↓</button><button type="button" aria-label={`第${index+1}希望を削除`} disabled={pending || closed} onClick={() => toggle(id)}>×</button></div></li>)}</ol>{!preferences.length && <p className={styles.empty}>図面または一覧から区画を選び、希望に追加してください。</p>}
    <label className="field">主催者へのメッセージ<textarea rows={3} maxLength={2000} value={message} disabled={pending || closed} onChange={event => setMessage(event.target.value)} /></label>
    <div className={styles.notice}>ジャンル別枠がある場合は上限を守り、提示額の高い順で割り当てます。同額なら、その金額を先に提示した人が優先です。増額時は優先日時が更新され、同額での希望順位変更では維持されます。</div>
    {mine && <p className={styles.note}>この金額を登録した日時：{new Date(mine.amount_submitted_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}（日本時間）</p>}
    <label className={styles.check}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={pending || closed} required /><span>割当時は提示額 {yen(Number(amount)||0)} を支払い、希望区画が埋まった場合は補欠となることを確認しました。</span></label>
    <button className="button button-primary" disabled={pending || closed || !cap || !preferences.length || !accepted || stale} aria-busy={pending}>{pending ? '保存中…' : mine ? '応募条件を更新する' : 'この条件で応募する'}</button>
    {stale && <p className={styles.notice}>別の操作で応募が更新されました。<button type="button" onClick={() => window.location.reload()}>最新の応募を読み込む</button></p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}<Link href="/vendor/applications" className={styles.textLink}>応募状況を見る →</Link></form></aside>
  </div>
}
