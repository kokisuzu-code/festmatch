'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SpaceSelector from '@/components/SpaceSelector'

type Car = { id: string; name: string; genre: string[] }
type App = { id: string; status: string; vendor_id: string } | null
type Slot = { genre: string; max_count: number; approved_count: number }
type Space = { id: string; name: string; fee: number; max_count: number; approved_count: number; genre: string | null; description: string | null }

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:  { label: '審査中',   color: 'bg-yellow-900/30 text-yellow-300' },
  approved: { label: '承認済み', color: 'bg-green-900/30 text-green-400' },
  declined: { label: '見送り',   color: 'bg-red-900/30 text-red-400' },
  cancelled:{ label: 'キャンセル', color: 'bg-slate-700 text-slate-400' },
}

export default function ApplyButton({
  eventId,
  myCars,
  existingApp,
  genreSlots,
}: {
  eventId: string
  myCars: Car[]
  existingApp: App
  genreSlots: Slot[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [showModal, setShowModal] = useState(false)
  const [selectedCar, setSelectedCar] = useState<string>(myCars[0]?.id ?? '')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
  const [appealText, setAppealText] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 応募済みの場合
  if (existingApp) {
    const s = statusLabel[existingApp.status] ?? statusLabel.pending
    return (
      <div className={`w-full text-center py-4 rounded-2xl font-semibold text-base ${s.color}`}>
        {s.label}
      </div>
    )
  }

  // キッチンカー未登録
  if (myCars.length === 0) {
    return (
      <a
        href="/kitchen-cars/new"
        className="block w-full bg-gray-800 text-white text-center font-semibold py-4 rounded-2xl text-base"
      >
        先にキッチンカーを登録する
      </a>
    )
  }

  const handleApply = async () => {
    if (!selectedCar || !selectedGenre) {
      setError('キッチンカーとジャンルを選択してください')
      return
    }
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.from('applications').insert({
      event_id: eventId,
      vendor_id: selectedCar,
      genre: selectedGenre,
      space_id: selectedSpace?.id ?? null,
      appeal_text: appealText.trim() || null,
    })

    if (err) {
      setError(err.message.includes('duplicate') ? 'すでに応募済みです' : '応募に失敗しました')
      setLoading(false)
      return
    }

    setShowModal(false)
    router.refresh()
  }

  const genres = genreSlots.length > 0
    ? genreSlots.map(s => s.genre)
    : myCars.find(c => c.id === selectedCar)?.genre ?? []

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-2xl text-base transition-colors"
      >
        このイベントに応募する
      </button>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-slate-800 w-full max-w-lg rounded-t-3xl p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-100">応募内容を選択</h3>

            {/* キッチンカー選択 */}
            {myCars.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">キッチンカー</label>
                <div className="space-y-2">
                  {myCars.map(car => (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => setSelectedCar(car.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                        selectedCar === car.id ? 'border-green-500 bg-green-950/40' : 'border-slate-700'
                      }`}
                    >
                      <p className="font-medium text-slate-100">{car.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{car.genre.join('・')}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ジャンル選択 */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">応募ジャンル</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => { setSelectedGenre(genre); setSelectedSpace(null) }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedGenre === genre
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* 区画選択（区画が設定されているイベントのみ表示） */}
            {selectedGenre && (
              <SpaceSelector
                eventId={eventId}
                genre={selectedGenre}
                onSelect={setSelectedSpace}
              />
            )}

            {/* アピール文 */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                アピールポイント
                <span className="text-slate-500 font-normal ml-1">（任意・主催者に表示されます）</span>
              </label>
              <textarea
                value={appealText}
                onChange={e => setAppealText(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="例：週末フェスに10年以上出店してきたスパイスカレー専門店です。行列必至のキーマカレーが自慢です。SNSフォロワー5000人以上おり、集客力もあります。"
                className="w-full border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-100 bg-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <p className="text-xs text-slate-500 text-right mt-1">{appealText.length}/300</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleApply}
              disabled={loading || !selectedGenre}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-base transition-colors"
            >
              {loading ? '応募中...' : '応募する'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
