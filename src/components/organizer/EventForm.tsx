'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import MapLocationPicker from '@/components/map/MapLocationPicker'
import SubmitButton from '@/components/SubmitButton'
import { PREFECTURES } from '@/lib/prefectures'
import styles from './EventForm.module.css'

type EventFormData = {
  title?: string
  description?: string | null
  prefecture?: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  starts_at?: string
  ends_at?: string
  application_deadline_at?: string | null
  capacity?: number | null
  booth_fee_yen?: number
  status?: string
  cover_photo_path?: string | null
}

const stepLabels = [
  ['基本情報', '日時・会場'],
  ['出店設定', '募集枠・料金'],
  ['確認・保存', '最終確認'],
] as const

const initialGenreSlots = [
  { genre: '唐揚げ・揚げ物', capacity: 2 },
  { genre: 'クレープ・スイーツ', capacity: 2 },
  { genre: 'カレー・スパイス料理', capacity: 2 },
  { genre: 'タコス・メキシカン', capacity: 2 },
  { genre: 'コーヒー・ドリンク', capacity: 1 },
  { genre: 'その他', capacity: 1 },
]

function localDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function displayDateTime(value: string) {
  if (!value) return '未入力'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function money(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? new Intl.NumberFormat('ja-JP').format(number) : '0'
}

function coverUrl(path?: string | null) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/event-images/${path}` : ''
}

function cssUrl(value: string) {
  return `url(${JSON.stringify(value)})`
}

export default function EventForm({ action, event }: { action: (formData: FormData) => void | Promise<void>; event?: EventFormData }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState(event?.title ?? '')
  const [prefecture, setPrefecture] = useState(event?.prefecture ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [startsAt, setStartsAt] = useState(localDateTime(event?.starts_at))
  const [endsAt, setEndsAt] = useState(localDateTime(event?.ends_at))
  const [deadline, setDeadline] = useState(localDateTime(event?.application_deadline_at))
  const [capacity, setCapacity] = useState(String(event?.capacity ?? 10))
  const [fee, setFee] = useState(String(event?.booth_fee_yen ?? 25000))
  const [genreSlots, setGenreSlots] = useState(initialGenreSlots)
  const [options, setOptions] = useState([true, false, true, true])
  const [description, setDescription] = useState(event?.description ?? '')
  const [published, setPublished] = useState(event?.status === 'published')
  const [coverPreview, setCoverPreview] = useState(coverUrl(event?.cover_photo_path))
  const [coverError, setCoverError] = useState('')

  useEffect(() => () => {
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
  }, [coverPreview])

  const place = [prefecture, address].filter(Boolean).join(' ')
  const genreTotal = genreSlots.reduce((sum, slot) => sum + slot.capacity, 0)

  function selectCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      event.target.value = ''
      setCoverError('JPG・PNG・WebP形式の画像を選択してください。')
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      event.target.value = ''
      setCoverError('画像サイズは6MB以下にしてください。')
      return
    }
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    setCoverPreview(URL.createObjectURL(file))
    setCoverError('')
  }

  function goNext() {
    const fields = step === 1
      ? ['title', 'prefecture', 'starts_at', 'ends_at']
      : ['capacity', 'booth_fee_yen']
    const invalid = fields
      .map((name) => formRef.current?.elements.namedItem(name))
      .find((field): field is HTMLInputElement | HTMLSelectElement => (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && !field.checkValidity())
    if (invalid) {
      invalid.reportValidity()
      return
    }
    setStep((current) => Math.min(3, current + 1))
  }

  return (
    <form action={action} className={styles.eventForm} ref={formRef}>
      <header className={styles.pageHeader}>
        <div>
          <p>CREATE EVENT</p>
          <h1>{event ? 'イベントを編集' : '新規イベントを作成'}</h1>
          <span>{event ? '公開情報を更新します。' : '必要な情報を3ステップで登録します。'}</span>
        </div>
        <Link href="/organizer/events">キャンセル</Link>
      </header>

      <div className={styles.createLayout}>
        <ol className={styles.steps}>
          {stepLabels.map(([label, descriptionText], index) => {
            const number = index + 1
            return (
              <li className={step === number ? styles.active : step > number ? styles.done : ''} key={label}>
                <span>{step > number ? '✓' : number}</span>
                <div><strong>{label}</strong><small>{descriptionText}</small></div>
              </li>
            )
          })}
        </ol>

        <section className={styles.card}>
          <div className={styles.formSection} hidden={step !== 1}>
            <div className={styles.formHeading}><span>01</span><div><h2>基本情報</h2><p>出店者に表示されるイベント概要です。</p></div></div>
            <label>イベント名 <em>必須</em><input maxLength={120} name="title" onChange={(e) => setTitle(e.target.value)} required value={title} /></label>
            <label className={styles.coverLabel}>
              イベント写真
              <span className={`${styles.coverUpload} ${coverPreview ? styles.hasImage : ''}`} style={coverPreview ? { backgroundImage: cssUrl(coverPreview) } : undefined}>
                {coverPreview ? <b>写真を変更</b> : <><strong>＋ 写真を追加</strong><small>JPG・PNG・WebP／6MBまで</small></>}
                <input accept="image/jpeg,image/png,image/webp" aria-label="イベント写真を選択" name="cover_photo" onChange={selectCover} type="file" />
              </span>
              {coverError && <span className={styles.coverError}>{coverError}</span>}
            </label>
            <div className={styles.grid}>
              <label>開催開始 <em>必須</em><input name="starts_at" onChange={(e) => setStartsAt(e.target.value)} required type="datetime-local" value={startsAt} /></label>
              <label>開催終了 <em>必須</em><input name="ends_at" onChange={(e) => setEndsAt(e.target.value)} required type="datetime-local" value={endsAt} /></label>
            </div>
            <label>応募締切<input name="application_deadline_at" onChange={(e) => setDeadline(e.target.value)} type="datetime-local" value={deadline} /></label>
            <div className={styles.grid}>
              <label>都道府県 <em>必須</em><select name="prefecture" onChange={(e) => setPrefecture(e.target.value)} required value={prefecture}><option value="">選択してください</option>{PREFECTURES.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></label>
              <label>会場・住所<input name="address" onChange={(e) => setAddress(e.target.value)} value={address} /></label>
            </div>
            <label>イベント説明<textarea maxLength={5_000} name="description" onChange={(e) => setDescription(e.target.value)} rows={5} value={description} /></label>
            <div className={styles.mapBlock}><p>会場の位置</p><MapLocationPicker initialLat={event?.latitude} initialLng={event?.longitude} /></div>
          </div>

          <div className={styles.formSection} hidden={step !== 2}>
            <div className={styles.formHeading}><span>02</span><div><h2>出店設定</h2><p>募集枠と出店料金を設定します。</p></div></div>
            <input name="genre_slots" type="hidden" value={JSON.stringify(genreSlots)} />
            <div className={styles.grid}>
              <label>出店枠（合計） <em>必須</em><input min="1" name="capacity" onChange={(e) => setCapacity(e.target.value)} required step="1" type="number" value={capacity} /></label>
              <label>出店料（円／台） <em>必須</em><input min="0" name="booth_fee_yen" onChange={(e) => setFee(e.target.value)} required step="1" type="number" value={fee} /></label>
            </div>
            <div className={styles.genreEditor}>
              {genreSlots.map((slot, index) => (
                <div key={slot.genre}>
                  <span>{slot.genre}</span>
                  <div>
                    <button aria-label={`${slot.genre}を1台減らす`} onClick={() => setGenreSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, capacity: Math.max(1, item.capacity - 1) } : item))} type="button">−</button>
                    <strong>{slot.capacity}</strong>
                    <button aria-label={`${slot.genre}を1台増やす`} onClick={() => setGenreSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, capacity: item.capacity + 1 } : item))} type="button">＋</button>
                    <small>台</small>
                  </div>
                </div>
              ))}
            </div>
            <p className={`${styles.slotNote} ${genreTotal !== Number(capacity) ? styles.slotWarning : ''}`}>
              {genreTotal === Number(capacity) ? `✓ 全${capacity}台の枠を設定済み` : `設定 ${genreTotal}台 ／ 合計 ${capacity || 0}台`}
            </p>
            <div className={styles.optionGrid}>
              {['電源提供あり', '給水設備あり', '補欠登録を受け付ける', 'キャンセルポリシー適用'].map((label, index) => (
                <div className={styles.toggleRow} key={label}>
                  <span>{label}</span>
                  <button aria-pressed={options[index]} className={options[index] ? styles.on : ''} onClick={() => setOptions((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} type="button"><i /></button>
                </div>
              ))}
            </div>
            {event ? <label className={styles.publishToggle}><input checked={published} name="status" onChange={(e) => setPublished(e.target.checked)} type="checkbox" value="published" /><span><strong>公開して募集を開始する</strong><small>公開には有効な年間契約またはスポット契約が必要です。</small></span></label> : <div className={styles.infoNote}><strong>まず下書きとして保存されます</strong><p>作成後のイベント詳細画面でジャンル別枠・出店区画を設定し、契約状況を確認してから公開できます。</p></div>}
          </div>

          <div className={styles.formSection} hidden={step !== 3}>
            <div className={styles.formHeading}><span>03</span><div><h2>確認・保存</h2><p>登録する内容を最終確認してください。</p></div></div>
            <div className={`${styles.preview} ${coverPreview ? styles.previewWithCover : ''}`} style={coverPreview ? { backgroundImage: `linear-gradient(90deg, rgba(12,16,13,.94), rgba(12,16,13,.5)), ${cssUrl(coverPreview)}` } : undefined}>
              <span>{published ? '公開中' : '下書き'}</span>
              <h2>{title || 'イベント名未入力'}</h2>
              <p>{place || '会場未入力'}</p>
              <div><span>{displayDateTime(startsAt)}</span><span>{capacity || '—'}台募集</span><span>¥{money(fee)}／台</span></div>
            </div>
            <div className={styles.checkList}>
              <span>✓ 基本情報を入力済み</span>
              <span>{genreTotal === Number(capacity) ? '✓ ジャンル枠を設定済み' : '○ ジャンル枠を確認してください'}</span>
              <span>{deadline ? '✓ 応募締切を設定済み' : '○ 応募締切は未設定'}</span>
            </div>
          </div>

          <footer className={styles.footer}>
            {step > 1 ? <button className={styles.secondaryButton} onClick={() => setStep((current) => current - 1)} type="button">戻る</button> : <span />}
            {step < 3
              ? <button className={styles.primaryButton} onClick={goNext} type="button">次へ →</button>
              : <SubmitButton className={styles.primaryButton} pendingLabel={event ? '保存中…' : '作成中…'}>{event ? '変更を保存' : '下書きを作成'}</SubmitButton>}
          </footer>
        </section>
      </div>
    </form>
  )
}
