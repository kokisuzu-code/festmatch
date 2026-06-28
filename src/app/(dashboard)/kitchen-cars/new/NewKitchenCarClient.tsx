'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// 🏆 TOP5: 唐揚げ・クレープ・たこ焼き・カレー・タコス（国内フェス実績順）
const GENRES = [
  '唐揚げ・揚げ物',
  'クレープ・スイーツ',
  'たこ焼き・お好み焼き',
  'カレー・スパイス料理',
  'タコス・タコライス',
  'やきそば・焼きうどん',
  'ラーメン・麺類',
  'バーガー・サンドイッチ',
  'BBQ・焼き肉・串焼き',
  'ピザ・パスタ',
  'アジアン・エスニック料理',
  'その他',
]

export default function NewKitchenCarPage() {
  const router = useRouter()
  const supabase = createClient()
  const photoRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [carLength, setCarLength] = useState('')
  const [needsPower, setNeedsPower] = useState(false)
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('写真は5MB以下にしてください'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedGenres.length === 0) { setError('ジャンルを1つ以上選択してください'); return }
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // まずキッチンカーを作成
    const { data: car, error: carErr } = await supabase.from('vendors').insert({
      owner_id: user.id,
      name,
      genre: selectedGenres,
      car_length_m: carLength ? parseFloat(carLength) : null,
      needs_power: needsPower,
      instagram_url: instagramUrl || null,
      tiktok_url: tiktokUrl || null,
    }).select('id').single()

    if (carErr || !car) {
      setError('登録に失敗しました: ' + carErr?.message)
      setLoading(false)
      return
    }

    // 写真アップロード
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${car.id}/profile.${ext}`
      const { data: uploaded } = await supabase.storage
        .from('kitchen-car-photos')
        .upload(path, photoFile, { upsert: true })
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('kitchen-car-photos').getPublicUrl(uploaded.path)
        await supabase.from('vendors').update({ photo_url: publicUrl }).eq('id', car.id)
      }
    }

    router.push('/browse')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-28">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-slate-400 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-slate-100">キッチンカーを登録</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6 max-w-lg mx-auto">

        {/* プロフィール写真 */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-3">プロフィール写真</label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => photoRef.current?.click()}
              className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-green-500 transition-colors shrink-0"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <button type="button" onClick={() => photoRef.current?.click()}
                className="text-sm text-green-400 hover:text-green-300 font-medium">
                写真を選択
              </button>
              <p className="text-xs text-slate-500 mt-1">JPG・PNG・WEBP（5MB以下）</p>
              <p className="text-xs text-slate-500">主催者が承認画面で確認します</p>
            </div>
          </div>
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
        </div>

        {/* 車両名 */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">屋号・車両名 *</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)} required
            className="w-full border border-slate-600 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="例：スパイスカレー マサラ号"
          />
        </div>

        {/* ジャンル */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            料理ジャンル * <span className="text-slate-500 font-normal">（複数選択可）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(genre => (
              <button key={genre} type="button" onClick={() => toggleGenre(genre)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedGenres.includes(genre)
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 border border-slate-600 text-slate-200'
                }`}>
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* 車長 */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">車長（メートル）</label>
          <input
            type="number" value={carLength} onChange={e => setCarLength(e.target.value)}
            step="0.1" min="1" max="15"
            className="w-full border border-slate-600 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="例：6.0"
          />
        </div>

        {/* 電源 */}
        <div
          onClick={() => setNeedsPower(!needsPower)}
          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
            needsPower ? 'border-green-500 bg-green-950/40' : 'border-slate-700 bg-slate-800'
          }`}
        >
          <div>
            <p className="font-medium text-slate-100">⚡ 電源が必要</p>
            <p className="text-sm text-slate-400">調理機器の電源を使用する</p>
          </div>
          <div className={`w-12 h-7 rounded-full relative ${needsPower ? 'bg-green-600' : 'bg-slate-600'}`}>
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${needsPower ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {/* SNS */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">SNSアカウント</label>
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-pink-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <input
              type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none placeholder-slate-500"
              placeholder="https://instagram.com/youraccount"
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-slate-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/>
            </svg>
            <input
              type="url" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none placeholder-slate-500"
              placeholder="https://tiktok.com/@youraccount"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-4 py-4">
        <button
          onClick={handleSubmit as any}
          disabled={loading || !name}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-base transition-colors"
        >
          {loading ? '登録中...' : '登録する'}
        </button>
      </div>
    </div>
  )
}
