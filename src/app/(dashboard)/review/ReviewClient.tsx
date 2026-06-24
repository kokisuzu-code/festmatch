'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Car = {
  id: string
  name: string
  genre: string | null
  verified_status: string
  reject_reason: string | null
  verified_at: string | null
  profiles: { name: string | null } | null
}

type Document = {
  id: string
  vendor_id: string
  doc_type: string
  file_url: string
  file_name: string | null
  uploaded_at: string
}

const DOC_TYPE_LABEL: Record<string, string> = {
  business_license: '営業許可証',
  food_hygiene: '食品衛生責任者証',
  other: 'その他',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '審査中', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  approved: { label: '承認済み', color: 'text-green-600', bg: 'bg-green-50' },
  rejected: { label: '差し戻し', color: 'text-red-600', bg: 'bg-red-50' },
}

export default function ReviewClient({ cars, documents }: { cars: Car[]; documents: Document[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [rejectOpen, setRejectOpen] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const filtered = filter === 'all' ? cars : cars.filter(c => c.verified_status === filter)
  const counts = {
    pending: cars.filter(c => c.verified_status === 'pending').length,
    approved: cars.filter(c => c.verified_status === 'approved').length,
    rejected: cars.filter(c => c.verified_status === 'rejected').length,
  }

  const getDocsForCar = (carId: string) => documents.filter(d => d.vendor_id === carId)

  const approve = async (carId: string) => {
    setProcessing(carId)
    await supabase.from('vendors').update({
      verified_status: 'approved',
      verified_at: new Date().toISOString(),
      reject_reason: null,
    }).eq('id', carId)
    setProcessing(null)
    router.refresh()
  }

  const reject = async (carId: string) => {
    const reason = rejectReason[carId]?.trim()
    if (!reason) return
    setProcessing(carId)
    await supabase.from('vendors').update({
      verified_status: 'rejected',
      reject_reason: reason,
    }).eq('id', carId)
    setProcessing(null)
    setRejectOpen(null)
    setRejectReason(prev => ({ ...prev, [carId]: '' }))
    router.refresh()
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f5f5f5' }}>
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">書類審査</h1>
            <p className="text-xs text-gray-500">キッチンカーの審査管理</p>
          </div>
        </div>
        {counts.pending > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
            {counts.pending}件 審査待ち
          </span>
        )}
      </header>

      {/* フィルタータブ */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-1 overflow-x-auto">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-3 px-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              filter === f
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'pending' && `審査中 ${counts.pending > 0 ? `(${counts.pending})` : ''}`}
            {f === 'approved' && `承認済み (${counts.approved})`}
            {f === 'rejected' && `差し戻し (${counts.rejected})`}
            {f === 'all' && `すべて (${cars.length})`}
          </button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-sm">該当する申請がありません</p>
          </div>
        )}

        {filtered.map(car => {
          const docs = getDocsForCar(car.id)
          const st = STATUS_CONFIG[car.verified_status]
          const isRejectOpen = rejectOpen === car.id

          return (
            <div key={car.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* カードヘッダー */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{car.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st?.color} ${st?.bg}`}>
                      {st?.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {car.profiles?.name} · {car.genre ?? 'ジャンル未設定'}
                  </p>
                </div>
              </div>

              {/* 書類一覧 */}
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-gray-400 font-medium">提出書類</p>
                {docs.length === 0 ? (
                  <p className="text-xs text-gray-400">書類が提出されていません</p>
                ) : (
                  docs.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700">{DOC_TYPE_LABEL[doc.doc_type] ?? doc.doc_type}</p>
                        <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))
                )}
              </div>

              {/* 差し戻し理由（差し戻し済みの場合） */}
              {car.verified_status === 'rejected' && car.reject_reason && (
                <div className="mx-4 mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 font-medium mb-0.5">差し戻し理由</p>
                  <p className="text-xs text-red-500">{car.reject_reason}</p>
                </div>
              )}

              {/* アクションボタン */}
              {car.verified_status === 'pending' && (
                <div className="px-4 pb-4">
                  {!isRejectOpen ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRejectOpen(car.id)}
                        disabled={processing === car.id}
                        className="flex-1 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        差し戻す
                      </button>
                      <button
                        onClick={() => approve(car.id)}
                        disabled={processing === car.id}
                        className="flex-1 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                      >
                        {processing === car.id ? '処理中...' : '承認する'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason[car.id] ?? ''}
                        onChange={e => setRejectReason(prev => ({ ...prev, [car.id]: e.target.value }))}
                        placeholder="差し戻し理由を入力してください..."
                        rows={3}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-700"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRejectOpen(null)}
                          className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => reject(car.id)}
                          disabled={!rejectReason[car.id]?.trim() || processing === car.id}
                          className="flex-1 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 font-medium"
                        >
                          差し戻す
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {car.verified_status === 'approved' && car.verified_at && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-gray-400">
                    承認日: {new Date(car.verified_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        <Link href="/events" className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">イベント</span>
        </Link>
        <Link href="/review" className="flex-1 flex flex-col items-center py-3 gap-1 text-green-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium">審査</span>
        </Link>
        <Link href="/messages" className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-xs">チャット</span>
        </Link>
        <Link href="/dashboard" className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs">ホーム</span>
        </Link>
      </nav>
    </div>
  )
}
