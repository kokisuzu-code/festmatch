import MapLocationPicker from '@/components/map/MapLocationPicker'
import SubmitButton from '@/components/SubmitButton'
import { PREFECTURES } from '@/lib/prefectures'

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
}

function localDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function EventForm({ action, event }: { action: (formData: FormData) => void | Promise<void>; event?: EventFormData }) {
  return (
    <form action={action} className="panel form-stack event-form">
      <div className="section-heading"><div><p className="eyebrow">EVENT DETAILS</p><h1>{event ? 'イベントを編集' : 'イベントを作成'}</h1></div></div>
      <div className="form-grid">
        <label className="field field-wide">イベント名<input name="title" required maxLength={120} defaultValue={event?.title ?? ''} /></label>
        <label className="field">都道府県<select name="prefecture" required defaultValue={event?.prefecture ?? ''}><option value="">選択してください</option>{PREFECTURES.map((prefecture) => <option key={prefecture.slug} value={prefecture.name}>{prefecture.name}</option>)}</select></label>
        <label className="field field-wide">住所<input name="address" defaultValue={event?.address ?? ''} /></label>
        <label className="field">開催開始<input name="starts_at" type="datetime-local" required defaultValue={localDateTime(event?.starts_at)} /></label>
        <label className="field">開催終了<input name="ends_at" type="datetime-local" required defaultValue={localDateTime(event?.ends_at)} /></label>
        <label className="field">応募締切<input name="application_deadline_at" type="datetime-local" defaultValue={localDateTime(event?.application_deadline_at)} /></label>
        <label className="field">募集枠<input name="capacity" type="number" min="1" step="1" defaultValue={event?.capacity ?? ''} /></label>
        <label className="field">出店料（円）<input name="booth_fee_yen" type="number" min="0" step="1" defaultValue={event?.booth_fee_yen ?? 0} /></label>
        {event ? <label className="field checkbox-field"><input name="status" type="checkbox" value="published" defaultChecked={event.status === 'published'} /> 公開して募集を開始する</label> : <p className="field field-wide">新規イベントは下書きとして保存されます。公開には年間契約、またはこのイベント用のスポット契約が必要です。</p>}
        <label className="field field-wide">イベント説明<textarea name="description" rows={5} maxLength={5_000} defaultValue={event?.description ?? ''} /></label>
      </div>
      <div><p className="field-label">会場の位置</p><MapLocationPicker initialLat={event?.latitude} initialLng={event?.longitude} /></div>
      <SubmitButton pendingLabel={event ? '保存中…' : '作成中…'}>{event ? '変更を保存' : '下書きを作成'}</SubmitButton>
    </form>
  )
}
