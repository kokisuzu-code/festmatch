'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Document = {
  id: string
  doc_type: string
  file_url: string
  file_name: string | null
  uploaded_at: string
}

type Car = {
  id: string
  name: string
  verified_status: string
  reject_reason: string | null
}

const DOC_TYPES = [
  { key: 'business_license', label: '営業許可証', desc: '食品営業許可証のコピー（有効期限内のもの）' },
  { key: 'food_hygiene', label: '食品衛生責任者証', desc: '食品衛生責任者の資格証明書' },
  { key: 'other', label: 'その他書類', desc: '車検証・保険証書など任意で添付' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  unsubmitted: { label: '未提出', color: 'text-slate-400', bg: 'bg-slate-800', desc: '書類をアップロードして審査を申請してください' },
  pending:     { label: '審査中', color: 'text-yellow-400', bg: 'bg-yellow-900/30', desc: '書類を確認中です。承認まで数日かかる場合があります' },
  approved:    { label: '承認済み', color: 'text-green-400', bg: 'bg-green-900/30', desc: 'イベントへの応募が可能です' },
  rejected:    { label: '差し戻し', color: 'text-red-400', bg: 'bg-red-900/30', desc: '書類を修正して再提出してください' },
}

export default function DocumentsClient({ car, documents, userId }: {
  car: Car
  documents: Document[]
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const status = STATUS_CONFIG[car.verified_status] ?? STATUS_CONFIG.unsubmitted

  const getDocByType = (type: string) => documents.find(d => d.doc_type === type)

  const handleUpload = async (docType: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルは10MB以下にしてください')
      return
    }
    setUploading(docType)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${car.id}/${docType}_${Date.now()}.${ext}`

    const { data: uploaded, error: uploadErr } = await supabase.storage
      .from('kitchen-car-docs')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError('アップロードに失敗しました: ' + uploadErr.message)
      setUploading(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('kitchen-car-docs')
      .getPublicUrl(uploaded.path)

    // 既存の同タイプを削除して新規挿入
    await supabase.from('kitchen_car_documents')
      .delete()
      .eq('kitchen_car_id', car.id)
      .eq('doc_type', docType)

    await supabase.from('kitchen_car_documents').insert({
      kitchen_car_id: car.id,
      doc_type: docType,
      file_url: publicUrl,
      file_name: file.name,
    })

    setUploading(null)
    router.refresh()
  }

  const handleSubmit = async () => {
    const required = ['business_license', 'food_hygiene']
    const uploaded = documents.map(d => d.doc_type)
    const missing = required.filter(r => !uploaded.includes(r))

    if (missing.length > 0) {
      setError('営業許可証と食品衛生責任者証は必須です')
      return
    }

    setSubmitting(true)
    await supabase.from('kitchen_cars')
      .update({ verified_status: 'pending' })
      .eq('id', car.id)

    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-base font-semibold text-slate-100">書類審査</h1>
          <p className="text-xs text-slate-400">{car.name}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* 審査ステータス */}
        <div className={`${status.bg} rounded-xl p-4 border border-slate-700`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
            {car.verified_status === 'approved' && (
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-xs text-slate-400">{status.desc}</p>
          {car.verified_status === 'rejected' && car.reject_reason && (
            <div className="mt-2 bg-red-900/20 rounded-lg p-3 border border-red-800">
              <p className="text-xs text-red-300 font-medium mb-0.5">差し戻し理由</p>
              <p className="text-xs text-red-200">{car.reject_reason}</p>
            </div>
          )}
        </div>

        {/* 書類アップロード */}
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">書類をアップロード</p>
          <div className="space-y-3">
            {DOC_TYPES.map(dt => {
              const existing = getDocByType(dt.key)
              const isUploading = uploading === dt.key
              const isRequired = dt.key !== 'other'

              return (
                <div key={dt.key} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-100">{dt.label}</p>
                        {isRequired && <span className="text-xs text-red-400">必須</span>}
                        {existing && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            提出済み
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{dt.desc}</p>
                      {existing && (
                        <p className="text-xs text-slate-500 mt-1 truncate">📎 {existing.file_name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => fileRefs.current[dt.key]?.click()}
                      disabled={isUploading || car.verified_status === 'approved'}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-green-500 hover:text-green-400 disabled:opacity-40 transition-colors"
                    >
                      {isUploading ? 'アップロード中...' : existing ? '差し替え' : 'アップロード'}
                    </button>
                    <input
                      ref={el => { fileRefs.current[dt.key] = el }}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) handleUpload(dt.key, f)
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-4 py-3">{error}</p>
        )}

        {/* 審査申請ボタン */}
        {(car.verified_status === 'unsubmitted' || car.verified_status === 'rejected') && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {submitting ? '申請中...' : '審査を申請する'}
          </button>
        )}

        {car.verified_status === 'pending' && (
          <p className="text-center text-xs text-slate-500">審査中は書類の変更ができません</p>
        )}
      </main>
    </div>
  )
}
