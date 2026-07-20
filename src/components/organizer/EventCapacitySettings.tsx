'use client'

import { useState, useTransition } from 'react'
import { saveEventCapacitySettings } from '@/app/organizer/events/actions'

type GenreSlot = { id: string; genre: string; capacity: number }
type EventSpace = { id: string; label: string; genre: string | null; assigned_application_id: string | null }

type EditableSlot = GenreSlot | { id?: string; genre: string; capacity: number }
type EditableSpace = EventSpace | { id?: string; label: string; genre: string | null; assigned_application_id?: string | null }

export default function EventCapacitySettings({
  eventId,
  initialSlots,
  initialSpaces,
}: {
  eventId: string
  initialSlots: GenreSlot[]
  initialSpaces: EventSpace[]
}) {
  const [slots, setSlots] = useState<EditableSlot[]>(initialSlots)
  const [spaces, setSpaces] = useState<EditableSpace[]>(initialSpaces)
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()

  function save() {
    setNotice('')
    startTransition(async () => {
      try {
        await saveEventCapacitySettings(
          eventId,
          slots.map((slot) => ({ id: slot.id, genre: slot.genre, capacity: Number(slot.capacity) })),
          spaces.map((space) => ({ id: space.id, label: space.label, genre: space.genre })),
        )
        setNotice('ジャンル枠と区画を保存しました。')
      } catch {
        setNotice('保存できませんでした。入力内容と割当状況を確認してください。')
      }
    })
  }

  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">SLOTS & SPACES</p><h2>ジャンル枠・出店区画</h2></div></div>
      <p className="panel-copy">ジャンルごとの承認上限と、承認時に割り当てる物理区画を設定します。割当済みの区画は削除できません。</p>

      <div className="capacity-settings-grid">
        <div className="capacity-settings-section">
          <div className="capacity-settings-title"><h3>ジャンル別枠</h3><button type="button" className="button button-secondary" onClick={() => setSlots((current) => [...current, { genre: '', capacity: 1 }])}>枠を追加</button></div>
          {slots.length ? <div className="capacity-row-list">{slots.map((slot, index) => <div className="capacity-row" key={slot.id ?? `slot-${index}`}><label>ジャンル<input value={slot.genre} maxLength={100} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, genre: event.target.value } : item))} placeholder="例：カレー" /></label><label>定員<input type="number" min="1" step="1" value={slot.capacity} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, capacity: Number(event.target.value) } : item))} /></label><button type="button" className="text-button" onClick={() => setSlots((current) => current.filter((_, itemIndex) => itemIndex !== index))}>削除</button></div>)}</div> : <p className="form-subtle">設定しないジャンルには、ジャンル別の上限は適用されません。</p>}
        </div>

        <div className="capacity-settings-section">
          <div className="capacity-settings-title"><h3>出店区画</h3><button type="button" className="button button-secondary" onClick={() => setSpaces((current) => [...current, { label: '', genre: null }])}>区画を追加</button></div>
          {spaces.length ? <div className="capacity-row-list">{spaces.map((space, index) => <div className="capacity-row capacity-space-row" key={space.id ?? `space-${index}`}><label>区画ラベル<input value={space.label} maxLength={80} onChange={(event) => setSpaces((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="例：A-1" /></label><label>ジャンル（任意）<input value={space.genre ?? ''} maxLength={100} onChange={(event) => setSpaces((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, genre: event.target.value || null } : item))} placeholder="例：カレー" /></label>{space.assigned_application_id ? <span className="status">割当済み</span> : <button type="button" className="text-button" onClick={() => setSpaces((current) => current.filter((_, itemIndex) => itemIndex !== index))}>削除</button>}</div>)}</div> : <p className="form-subtle">区画を設定したイベントでは、承認時に空き区画の割当が必要です。</p>}
        </div>
      </div>

      <div className="capacity-save-row"><button type="button" className="button button-primary" disabled={pending} onClick={save}>{pending ? '保存中' : '枠・区画を保存'}</button>{notice && <p className="form-subtle">{notice}</p>}</div>
    </section>
  )
}
