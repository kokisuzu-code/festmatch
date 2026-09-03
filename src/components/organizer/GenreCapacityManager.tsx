'use client'

import { useState, useTransition } from 'react'
import { saveEventCapacitySettings } from '@/app/organizer/events/actions'

type Slot = { id?: string; genre: string; capacity: number }
type Space = { id?: string; label: string; genre: string | null }

export default function GenreCapacityManager({
  eventId,
  initialSlots,
  spaces,
  approvedByGenre,
  applicationsByGenre,
}: {
  eventId: string
  initialSlots: Slot[]
  spaces: Space[]
  approvedByGenre: Record<string, number>
  applicationsByGenre: Record<string, number>
}) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()
  const total = slots.reduce((sum, slot) => sum + slot.capacity, 0)
  const approved = slots.reduce((sum, slot) => sum + (approvedByGenre[slot.genre] ?? 0), 0)
  const remaining = Math.max(0, total - approved)

  function updateCapacity(index: number, delta: number) {
    setSlots((current) => current.map((slot, itemIndex) => itemIndex === index ? { ...slot, capacity: Math.max(1, slot.capacity + delta) } : slot))
  }

  function save() {
    setNotice('')
    startTransition(async () => {
      try {
        await saveEventCapacitySettings(eventId, slots, spaces)
        setNotice('ジャンル枠を保存しました。')
      } catch {
        setNotice('保存できませんでした。内容を確認してください。')
      }
    })
  }

  return (
    <section className="genre-capacity-card">
      <div className="genre-capacity-summary">
        <div><span>全体枠</span><strong>{total}台</strong></div>
        <div><span>承認済み</span><strong>{approved}台</strong></div>
        <div><span>残り</span><strong>{remaining}台</strong></div>
        <i><b style={{ width: `${total ? Math.min(100, Math.round((approved / total) * 100)) : 0}%` }} /></i>
        <small>{total ? Math.round((approved / total) * 100) : 0}% 確定</small>
      </div>

      <div className="genre-capacity-list">
        {slots.map((slot, index) => {
          const approvedCount = approvedByGenre[slot.genre] ?? 0
          const applicationCount = applicationsByGenre[slot.genre] ?? 0
          return (
            <div className="genre-capacity-row" key={slot.id ?? `${slot.genre}-${index}`}>
              <span className="genre-capacity-icon" aria-hidden="true">▦</span>
              <div className="genre-capacity-copy">
                <input aria-label={`${slot.genre}のジャンル名`} maxLength={100} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, genre: event.target.value } : item))} value={slot.genre} />
                <small>承認 {approvedCount}台・応募 {applicationCount}台</small>
              </div>
              <i><b style={{ width: `${Math.min(100, Math.round((approvedCount / slot.capacity) * 100))}%` }} /></i>
              <span className="genre-capacity-ratio">{approvedCount} / {slot.capacity}</span>
              <button aria-label={`${slot.genre}を1台減らす`} onClick={() => updateCapacity(index, -1)} type="button">−</button>
              <strong>{slot.capacity}</strong>
              <button aria-label={`${slot.genre}を1台増やす`} onClick={() => updateCapacity(index, 1)} type="button">＋</button>
            </div>
          )
        })}
      </div>

      <div className="genre-capacity-actions">
        <button className="button button-secondary" onClick={() => setSlots((current) => [...current, { genre: '新しいジャンル', capacity: 1 }])} type="button">＋ ジャンルを追加</button>
        <div>{notice && <span>{notice}</span>}<button className="button button-primary" disabled={pending} aria-busy={pending} onClick={save} type="button">{pending ? '保存中…' : '変更を保存'}</button></div>
      </div>
    </section>
  )
}
