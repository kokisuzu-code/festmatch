import { requireAdmin } from '@/lib/auth'
import { createExternalEvent } from '@/app/admin/festmap/actions'
import SubmitButton from '@/components/SubmitButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: '外部イベントを登録', description: 'FestMapに公式ソースの外部イベントを登録します。' }

export default async function AdminFestMapPage() {
  await requireAdmin()
  return <main className="admin-page"><form action={createExternalEvent} className="public-apply-form"><p className="eyebrow">FESTMAP ADMIN</p><h1>外部イベントを登録</h1><p>公式サイト・自治体・公式SNSで確認できる事実情報だけを登録してください。外部イベントはFestMapで破線表示され、応募・決済には接続しません。</p><label className="field">イベント名<input name="title" required maxLength={120} /></label><label className="field">都道府県<input name="prefecture" required /></label><label className="field">住所・会場<input name="address" /></label><label className="field">開催開始<input name="starts_at" type="datetime-local" required /></label><label className="field">開催終了<input name="ends_at" type="datetime-local" required /></label><label className="field">公式情報 URL<input name="official_url" type="url" required placeholder="https://" /></label><label className="field">確認元 URL<input name="source_url" type="url" required placeholder="https://" /></label><label className="field">説明<textarea name="description" rows={4} maxLength={5_000} /></label><SubmitButton pendingLabel="登録中…">公式情報として登録</SubmitButton></form></main>
}
