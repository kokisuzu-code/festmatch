'use client'

import { useState } from 'react'
import Link from 'next/link'
import ApplicationActions from './ApplicationActions'
import { createClient } from '@/lib/supabase/client'

const statusBadge: Record<string, { label: string; color: string }> = {
  pending:   { label: '審査中',     color: 'bg-amber-100 text-amber-700' },
  approved:  { label: '承認済み',   color: 'bg-green-100 text-green-700' },
  declined:  { label: '見送り',     color: 'bg-red-100 text-red-500' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-400' },
  waitlist:  { label: '補欠',       color: 'bg-blue-100 text-blue-600' },
}

export default function AppCard({ app, eventId, slots, genreApprovedCount, organizerId, isBookmarked: initialBookmarked, isBlacklisted: initialBlacklisted, readonly = false }: {
  app: any
  eventId: string
  slots: any[]
  genreApprovedCount: Record<string, number>
  organizerId: string
  isBookmarked: boolean
  isBlacklisted: boolean
  readonly?: boolean
}) {
  const [showProfile, setShowProfile] = useState(false)
  const [bookmarked, setBookmarked]   = useState(initialBookmarked)
  const [blacklisted, setBlacklisted] = useState(initialBlacklisted)
  const [saving, setSaving]           = useState(false)

  const car   = app.vendors
  const owner = car?.profiles
  const s     = statusBadge[app.status] ?? statusBadge.pending

  const vendorId   = car?.id
  const appGenre   = app.genre ?? car?.genre ?? ''
  const matchedSlot = slots.find((sl: any) => sl.genre === appGenre)
  const genreFull   = matchedSlot ? (genreApprovedCount[appGenre] ?? 0) >= matchedSlot.max_count : false

  const initChar   = (car?.name ?? owner?.name ?? '?')[0]
  const avatarUrl  = owner?.avatar_url
  const carPhotoUrl = car?.photo_url

  async function toggleBookmark() {
    if (!vendorId || saving) return
    setSaving(true)
    const supabase = createClient()
    if (bookmarked) {
      await supabase.from('vendor_bookmarks').delete()
        .eq('organizer_id', organizerId).eq('vendor_id', vendorId)
      setBookmarked(false)
    } else {
      await supabase.from('vendor_bookmarks').insert({ organizer_id: organizerId, vendor_id: vendorId })
      setBookmarked(true)
    }
    setSaving(false)
  }

  async function toggleBlacklist() {
    if (!vendorId || saving) return
    setSaving(true)
    const supabase = createClient()
    if (blacklisted) {
      await supabase.from('vendor_blacklists').delete()
        .eq('organizer_id', organizerId).eq('vendor_id', vendorId)
      setBlacklisted(false)
    } else {
      if (confirm(`${car?.name ?? 'このベンダー'} をブラックリストに追加しますか？\n以降の応募で非表示になります。`)) {
        await supabase.from('vendor_blacklists').insert({ organizer_id: organizerId, vendor_id: vendorId })
        setBlacklisted(true)
      }
    }
    setSaving(false)
  }

  return (
    <>
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${blacklisted ? 'opacity-50' : ''} ${readonly ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
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
            {/* お気に入りボタン */}
            <button
              onClick={toggleBookmark}
              disabled={saving}
              title={bookmarked ? 'お気に入りから削除' : 'お気に入りに追加'}
              className={`p-1.5 rounded-lg transition-colors ${bookmarked ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}
            >
              <svg className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* ブラックリストボタン */}
            <button
              onClick={toggleBlacklist}
              disabled={saving}
              title={blacklisted ? 'ブラックリストから削除' : 'ブラックリストに追加'}
              className={`p-1.5 rounded-lg transition-colors ${blacklisted ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>

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

        {/* ブラックリスト警告 */}
        {blacklisted && (
          <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-3">
            ブラックリスト登録済み — 次回以降の応募で非表示になります
          </div>
        )}

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

              {/* モーダル内アクション */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={toggleBookmark}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border transition-colors ${
                    bookmarked ? 'bg-amber-50 border-amber-200 text-amber-600' : 'border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {bookmarked ? 'お気に入り済み' : 'お気に入り'}
                </button>
                <button
                  onClick={() => { setShowProfile(false); toggleBlacklist() }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border transition-colors ${
                    blacklisted ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {blacklisted ? 'BL解除' : 'ブラックリスト'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {car?.car_length_m && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">車長 {car.car_length_m}m</span>
                )}
                {car?.needs_power && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">電源必要</span>
                )}
              </div>

              {car?.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-wrap">{car.description}</p>
              )}

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
