'use client'

import { useState } from 'react'
import Link from 'next/link'
import ApplicationActions from './ApplicationActions'

const statusBadge: Record<string, { label: string; color: string }> = {
  pending:   { label: '審査中',     color: 'bg-amber-100 text-amber-700' },
  approved:  { label: '承認済み',   color: 'bg-green-100 text-green-700' },
  declined:  { label: '見送り',     color: 'bg-red-100 text-red-500' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-400' },
  waitlist:  { label: '補欠',       color: 'bg-blue-100 text-blue-600' },
}

export default function AppCard({ app, eventId, slots, genreApprovedCount, readonly = false }: {
  app: any
  eventId: string
  slots: any[]
  genreApprovedCount: Record<string, number>
  readonly?: boolean
}) {
  const [showProfile, setShowProfile] = useState(false)

  const car = app.kitchen_cars
  const owner = car?.profiles
  const s = statusBadge[app.status] ?? statusBadge.pending

  const appGenre = app.genre ?? car?.genre ?? ''
  const matchedSlot = slots.find((sl: any) => sl.genre === appGenre)
  const genreFull = matchedSlot ? (genreApprovedCount[appGenre] ?? 0) >= matchedSlot.max_count : false

  const initChar = (car?.name ?? owner?.name ?? '?')[0]
  const avatarUrl = owner?.avatar_url
  const carPhotoUrl = car?.photo_url

  return (
    <>
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${readonly ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* タップでプロフィールモーダル */}
            <button onClick={() => setShowProfile(true)} className="shrink-0 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-400">
              {carPhotoUrl ? (
                <img src={carPhotoUrl} alt={car.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-semibold">
                  {initChar}
                </div>
              )}
            </button>
            <div>
              <button onClick={() => setShowProfile(true)} className="text-sm font-medium text-gray-900 hover:text-green-700 text-left">
                {car?.name ?? '不明'}
              </button>
              <p className="text-xs text-gray-400">{appGenre}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {app.status === 'pending' && matchedSlot && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${genreFull ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-700'}`}>
                {appGenre}（{genreFull ? '定員満了' : '枠あり'}）
              </span>
            )}
            {app.status !== 'pending' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            )}
            <span className="text-xs text-gray-300">{new Date(app.applied_at).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>

        {/* タグ */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {car?.car_length_m && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">車長 {car.car_length_m}m</span>
          )}
          {car?.needs_power && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">電源必要</span>
          )}
          {car?.verified_status === 'approved' && (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">許可証確認済</span>
          )}
        </div>

        {/* アピール文 */}
        {app.appeal_text && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-0.5">アピールポイント</p>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3">{app.appeal_text}</p>
          </div>
        )}

        {/* 見送り理由 */}
        {app.decline_reason && (
          <p className="text-xs text-red-400 mb-3">見送り理由: {app.decline_reason}</p>
        )}

        {/* 承認済みのみチャットリンク */}
        {app.status === 'approved' && (
          <div className="pt-2 border-t border-gray-100">
            <Link href={`/messages/${app.id}`} className="text-xs text-green-600 font-medium hover:underline">
              メッセージを送る →
            </Link>
          </div>
        )}

        {/* アクションボタン（審査中のみ） */}
        {!readonly && app.status === 'pending' && (
          <div className="pt-2 border-t border-gray-100">
            <ApplicationActions
              applicationId={app.id}
              eventId={eventId}
              disabled={genreFull}
              disabledReason={genreFull ? '定員満了' : undefined}
            />
          </div>
        )}
      </div>

      {/* プロフィールモーダル */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            {/* ヘッダー：キッチンカー写真 */}
            {carPhotoUrl ? (
              <img src={carPhotoUrl} alt={car?.name} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-2xl font-bold">
                  {initChar}
                </div>
              </div>
            )}

            <div className="p-5">
              {/* オーナー情報 */}
              <div className="flex items-center gap-3 mb-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={owner?.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-semibold shrink-0">
                    {(owner?.name ?? '?')[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{car?.name ?? '不明'}</p>
                  <p className="text-xs text-gray-400">{owner?.name ?? ''} · {appGenre}</p>
                </div>
                {car?.verified_status === 'approved' && (
                  <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">許可証確認済</span>
                )}
              </div>

              {/* スペック */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {car?.car_length_m && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">車長 {car.car_length_m}m</span>
                )}
                {car?.needs_power && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">電源必要</span>
                )}
              </div>

              {/* キッチンカー説明 */}
              {car?.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-wrap">{car.description}</p>
              )}

              {/* アピール文 */}
              {app.appeal_text && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-100">
                  <p className="text-xs text-gray-400 font-medium mb-1">応募アピール</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{app.appeal_text}</p>
                </div>
              )}

              <button onClick={() => setShowProfile(false)} className="w-full text-sm text-gray-500 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
