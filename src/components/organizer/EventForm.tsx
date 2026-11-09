'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import SubmitButton from '@/components/SubmitButton'
import { PREFECTURES } from '@/lib/prefectures'
import { defaultGenreSlots } from '@/lib/genres'
import { eventImageUrl, tokyoDateTime, type EventDetails } from '@/lib/event-presentation'
import BoothMap from '@/components/bidding/BoothMap'
import type { BoothSpace, GenreCap } from '@/lib/booth-bidding'
import EventOverview, { type OverviewEvent } from '@/components/events/EventOverview'
import BoothLayoutEditor from '@/components/bidding/BoothLayoutEditor'
import styles from './EventForm.module.css'

type EventFormData = OverviewEvent & { status?: string; accepts_waitlist?: boolean }
const stepLabels = [['基本情報', '画像・日時・会場'], ['出店設定', '条件・区画・募集方法'], ['出店者プレビュー', '内容を確認して保存']] as const

export default function EventForm({ action, event, recruitmentEditor, hasApplications = false, previewSlots = [] }: {
  action: (formData: FormData) => void | Promise<void>; event?: EventFormData; recruitmentEditor?: ReactNode; hasApplications?: boolean; previewSlots?: GenreCap[];
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState(event?.title ?? '')
  const [prefecture, setPrefecture] = useState(event?.prefecture ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [details, setDetails] = useState<EventDetails>(event?.operations_info ?? {})
  const [startsAt, setStartsAt] = useState(tokyoDateTime(event?.starts_at))
  const [endsAt, setEndsAt] = useState(tokyoDateTime(event?.ends_at))
  const [deadline, setDeadline] = useState(tokyoDateTime(event?.application_deadline_at))
  const [capacity, setCapacity] = useState(String(event?.capacity ?? 10))
  const [fee, setFee] = useState(String(event?.booth_fee_yen ?? 33000))
  const [genreEnabled, setGenreEnabled] = useState(false)
  const [genreSlots, setGenreSlots] = useState(defaultGenreSlots)
  const [bidding, setBidding] = useState(false)
  const [spaces, setSpaces] = useState<BoothSpace[]>([])
  const [mapPreview, setMapPreview] = useState<string | null>(null)
  const [hasPower, setHasPower] = useState(event?.has_power ?? false)
  const [hasWater, setHasWater] = useState(event?.has_water ?? false)
  const [policy, setPolicy] = useState(event?.cancellation_policy ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [coverPreview, setCoverPreview] = useState(eventImageUrl(event?.cover_photo_path) ?? '')
  const [notice, setNotice] = useState('')
  useEffect(() => () => { if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview) }, [coverPreview])
  useEffect(() => () => { if (mapPreview?.startsWith('blob:')) URL.revokeObjectURL(mapPreview) }, [mapPreview])
  const genreTotal = genreSlots.reduce((sum, slot) => sum + slot.capacity, 0)
  function selectImage(e: ChangeEvent<HTMLInputElement>, setter: (url: string) => void) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
      e.target.value = ''; setNotice('JPG・PNG・WebP形式で6MB以下の画像を選んでください。'); return
    }
    setter(URL.createObjectURL(file)); setNotice('')
  }
  function validate(target: number) {
    setNotice('')
    const fields = target === 1 ? ['title','prefecture','starts_at','ends_at'] : ['capacity','booth_fee_yen']
    for (const name of fields) {
      const field = formRef.current?.elements.namedItem(name)
      if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && !field.checkValidity()) { field.reportValidity(); return false }
    }
    if (target === 1 && (!startsAt || !endsAt || endsAt <= startsAt)) { setNotice('開催終了は開催開始より後に設定してください。'); return false }
    if (target === 2) {
      if (deadline && deadline >= startsAt) { setNotice('応募締切は開催開始より前に設定してください。'); return false }
      if (!event && genreEnabled && genreTotal > Number(capacity)) { setNotice('ジャンル枠の合計を募集台数以下にしてください。'); return false }
      if (!event && bidding && (!deadline || !mapPreview || !spaces.length)) { setNotice('区画指定・入札募集には応募締切・区画図・1つ以上の区画が必要です。'); return false }
    }
    return true
  }
  function goNext() { if (validate(step)) { setStep(step + 1); formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }) } }
  async function saveForm(data: FormData) {
    setNotice('')
    try { await action(data) } catch(error) {
      if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error
      setNotice(error instanceof Error ? error.message : '保存できませんでした。もう一度お試しください。')
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    if (step < 3) { e.preventDefault(); goNext() }
  }
  function detail(key: keyof EventDetails, value: string) { setDetails(current => ({ ...current, [key]:value })) }
  const previewEvent: OverviewEvent = {
    title, prefecture, address, description, starts_at:`${startsAt}:00+09:00`, ends_at:`${endsAt}:00+09:00`,
    application_deadline_at:deadline ? `${deadline}:00+09:00` : null, capacity:Number(capacity), booth_fee_yen:Number(fee),
    expected_visitors:event?.expected_visitors, operations_info:details, has_power:hasPower, has_water:hasWater, cancellation_policy:policy,
    booth_bidding_enabled:event?.booth_bidding_enabled ?? bidding,
  }
  return <form action={saveForm} onSubmit={submit} className={styles.eventForm} ref={formRef}>
    <input type="hidden" name="status" value={event?.status ?? 'draft'} />
    <input type="hidden" name="genre_slots" value={JSON.stringify(genreEnabled ? genreSlots : [])} />
    <input type="hidden" name="booth_spaces" value={JSON.stringify(spaces.map(({id:_id,...space}) => ({...space, genre:genreEnabled ? space.genre : null})))} />
    <header className={styles.pageHeader}><div><p>{event ? 'EDIT EVENT' : 'CREATE EVENT'}</p><h1>{event ? 'イベントを編集' : '新規イベントを作成'}</h1><span>基本情報と出店設定を入力し、出店者からの見え方を確認します。</span></div><Link href="/organizer/events">イベント一覧へ</Link></header>
    {event?.status === 'published' && <p className={styles.infoNote}>公開中のイベントです。写真・説明・出店者への案内は公開後も編集できます。保存すると出店者画面にも反映されます。</p>}
    {hasApplications && <p className={styles.slotWarning}>応募済みの出店者がいます。日時・出店料・募集台数・締切・区画は固定されます。会場・案内を変更する場合は、応募者に変更内容をお知らせください。</p>}
    <div className={styles.createLayout}><ol className={styles.steps}>{stepLabels.map(([label,sub],i) => <li key={label} className={step === i+1 ? styles.active : step > i+1 ? styles.done : ''} aria-current={step === i+1 ? 'step' : undefined}><span>{step > i+1 ? '✓' : i+1}</span><div><strong>{label}</strong><small>{sub}</small></div></li>)}</ol>
    <section className={styles.card}>
      <div className={styles.formSection} hidden={step !== 1}>
        <div className={styles.formHeading}><span>01</span><div><h2>基本情報</h2><p>イベントの魅力と開催場所を伝えましょう。日時はすべて日本時間です。</p></div></div>
        <label>イベント名 <em>必須</em><input name="title" maxLength={120} required value={title} onChange={e => setTitle(e.target.value)} placeholder="例：湘南サンセット・フードフェス" /></label>
        <label>ポスター・イベント写真<span className={`${styles.coverUpload} ${coverPreview ? styles.hasImage : ''}`} style={coverPreview ? {backgroundImage:`url(${JSON.stringify(coverPreview)})`} : undefined}>{coverPreview ? <b>画像を変更</b> : <><strong>＋ 画像を選択</strong><small>JPG・PNG・WebP／6MBまで</small></>}<input name="cover_photo" aria-label="イベント画像" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => selectImage(e,setCoverPreview)} /></span></label>
        <div className={styles.grid}>{[['開催開始','starts_at',startsAt,setStartsAt],['開催終了','ends_at',endsAt,setEndsAt]].map(([label,name,value,setter]) => <label key={String(name)}>{String(label)} <em>必須</em><input name={String(name)} type="datetime-local" required readOnly={hasApplications} value={String(value)} onChange={e => (setter as (v:string)=>void)(e.target.value)} /></label>)}</div>
        <label>都道府県 <em>必須</em><select name="prefecture" required value={prefecture} onChange={e => setPrefecture(e.target.value)}><option value="">選択してください</option>{PREFECTURES.map(item => <option key={item.slug}>{item.name}</option>)}</select></label>
        <div className={styles.grid}><label>会場名<input name="venue_name" maxLength={200} value={String(details.venue_name ?? '')} onChange={e => detail('venue_name',e.target.value)} placeholder="例：湘南シーサイド広場" /></label><label>住所<input name="address" maxLength={500} value={address} onChange={e => setAddress(e.target.value)} placeholder="市区町村・番地を入力" /></label></div>
        <label>イベントの紹介・開催趣旨<textarea name="description" maxLength={5000} rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="どんなイベントで、誰に楽しんでほしいかを記載してください。" /></label>
      </div>
      <div className={styles.formSection} hidden={step !== 2}>
        <div className={styles.formHeading}><span>02</span><div><h2>出店設定</h2><p>募集方法・出店条件・主催者からの要望を設定します。</p></div></div>
        <div className={styles.grid}><label>募集台数 <em>必須</em><input name="capacity" min="1" max="1000" required type="number" readOnly={hasApplications} value={capacity} onChange={e => setCapacity(e.target.value)} /></label><label>{bidding || event?.booth_bidding_enabled ? '基準の最低出店料' : '出店料'}（税込・円／台） <em>必須</em><input name="booth_fee_yen" required min="0" max="1000000" type="number" readOnly={hasApplications} value={fee} onChange={e => setFee(e.target.value)} /></label></div>
        <label>応募締切（日本時間）<input name="application_deadline_at" type="datetime-local" readOnly={hasApplications} value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
        <label>主催者から出店者へのメッセージ<textarea name="host_message" maxLength={3000} rows={4} value={String(details.host_message ?? '')} onChange={e => detail('host_message',e.target.value)} placeholder="出店者に期待すること、イベントで大切にしたいことなど" /></label>
        <label>募集内容・出店条件<textarea name="requirements" maxLength={3000} rows={4} value={String(details.requirements ?? '')} onChange={e => detail('requirements',e.target.value)} placeholder="販売メニュー、車両サイズ、必要な書類など" /></label>
        <div className={styles.optionGrid}><label className={styles.publishToggle}><input type="checkbox" name="has_power" checked={hasPower} onChange={e => setHasPower(e.target.checked)} />電源の提供あり</label><label className={styles.publishToggle}><input type="checkbox" name="has_water" checked={hasWater} onChange={e => setHasWater(e.target.checked)} />給水設備あり</label></div>
        <label>搬入・当日の案内<textarea name="loading_info" maxLength={3000} rows={3} value={String(details.loading_info ?? '')} onChange={e => detail('loading_info',e.target.value)} placeholder="搬入時間、集合場所、退場方法など" /></label>
        <label>キャンセル条件<textarea name="cancellation_policy" maxLength={3000} rows={3} value={policy} onChange={e => setPolicy(e.target.value)} /></label>
        {!event && <>
          <label className={styles.publishToggle}><input type="checkbox" checked={genreEnabled} onChange={e => setGenreEnabled(e.target.checked)} /><span><strong>ジャンル別に募集枠を設定する（任意）</strong><small>オフならジャンルを制限せず、総募集台数で管理します。</small></span></label>
          {genreEnabled && <div className={styles.genreEditor}>{genreSlots.map((slot,i) => <label key={slot.genre} className={styles.genreRow}><span>{slot.genre}</span><input aria-label={`${slot.genre}の募集台数`} type="number" min="0" max="1000" value={slot.capacity} onChange={e => setGenreSlots(current => current.map((item,j) => j === i ? {...item,capacity:Number(e.target.value)} : item))} /></label>)}<p>設定 {genreTotal}台／全体 {capacity}台。0台のジャンルは募集しません。</p></div>}
          <label className={styles.publishToggle}><input type="checkbox" name="booth_bidding_enabled" checked={bidding} onChange={e => setBidding(e.target.checked)} /><span><strong>区画を選んで提示額を登録する募集にする</strong><small>オフなら固定の出店料で応募を受け付けます。</small></span></label>
          <label>区画図（{bidding ? '必須' : '任意'}）<input name="booth_map" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => selectImage(e,setMapPreview)} /></label>
          {mapPreview && <BoothLayoutEditor spaces={spaces} onChange={setSpaces} mapUrl={mapPreview} genreEnabled={genreEnabled} defaultFee={Math.max(1000,Math.ceil(Number(fee)/1000)*1000)} />}
        </>}
        {event && <p className={styles.infoNote}>区画・ジャンル設定は下の「募集設定」で保存できます。基本情報の保存とは別に保存してください。</p>}
        {recruitmentEditor}
      </div>
      <div className={styles.formSection} hidden={step !== 3}>
        <div className={styles.formHeading}><span>03</span><div><h2>出店者からの見え方</h2><p>画像・紹介・条件・案内を確認してください。</p></div></div>
        {step === 3 && <EventOverview event={previewEvent} coverUrl={coverPreview} slots={event ? previewSlots : genreEnabled ? genreSlots : []} />}
        {!event && mapPreview && <BoothMap url={mapPreview} spaces={spaces} />}{!event && <p className={styles.infoNote}>まず下書きとして保存します。保存後に公開できます。</p>}
      </div>
      {notice && <p className={styles.coverError} role="alert">{notice}</p>}
      <footer className={styles.footer}>{step > 1 ? <button className={styles.secondaryButton} type="button" onClick={() => {setStep(step-1);setNotice('')}}>← 戻る</button> : <span />}{step < 3 ? <button className={styles.primaryButton} type="button" onClick={goNext}>次へ →</button> : <SubmitButton className={styles.primaryButton} pendingLabel="保存中…">{event ? '変更を保存' : '下書きを保存'}</SubmitButton>}</footer>
    </section></div>
  </form>
}
