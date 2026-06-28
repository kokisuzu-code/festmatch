'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import OrganizerSidebarNav from '@/components/OrganizerSidebarNav'

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

type GenreSlot = { genre: string; max_count: number }

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 基本情報
  const [title, setTitle] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [dateInput, setDateInput] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('17:00')
  const [location, setLocation] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [expectedVisitors, setExpectedVisitors] = useState('1000')
  const [totalSlots, setTotalSlots] = useState('10')
  const [fee, setFee] = useState('10000')
  const [applyDeadline, setApplyDeadline] = useState('')
  const [description, setDescription] = useState('')

  // ジャンル枠
  const [genreSlots, setGenreSlots] = useState<GenreSlot[]>([{ genre: '', max_count: 2 }])
  const addGenreSlot = () => setGenreSlots([...genreSlots, { genre: '', max_count: 2 }])
  const removeGenreSlot = (i: number) => setGenreSlots(genreSlots.filter((_, j) => j !== i))
  const updateGenreSlot = (i: number, field: keyof GenreSlot, val: string | number) => {
    const u = [...genreSlots]; u[i] = { ...u[i], [field]: val }; setGenreSlots(u)
  }

  // 設備
  const [hasPower, setHasPower] = useState(false)
  const [hasWater, setHasWater] = useState(false)
  const [hasParking, setHasParking] = useState(false)
  const [hasDrainage, setHasDrainage] = useState(false)
  const [generatorOk, setGeneratorOk] = useState(false)

  // 環境
  const [isIndoor, setIsIndoor] = useState(false)
  const [vendorType, setVendorType] = useState<'kitchen_car_only' | 'tent_ok'>('kitchen_car_only')
  const [groundType, setGroundType] = useState<'asphalt' | 'grass'>('asphalt')
  const [hasWasteDisposal, setHasWasteDisposal] = useState(false)
  const [alcoholOk, setAlcoholOk] = useState(false)

  // カスタムタグ
  const [customFacilityTags, setCustomFacilityTags] = useState<string[]>([])
  const [customFacilityInput, setCustomFacilityInput] = useState('')
  const [customEnvTags, setCustomEnvTags] = useState<string[]>([])
  const [customEnvInput, setCustomEnvInput] = useState('')

  const addTag = (input: string, tags: string[], setTags: (t: string[]) => void, setInput: (v: string) => void) => {
    const val = input.trim()
    if (val && !tags.includes(val)) setTags([...tags, val])
    setInput('')
  }
  const removeTag = (tag: string, tags: string[], setTags: (t: string[]) => void) =>
    setTags(tags.filter(t => t !== tag))

  // 画像
  const posterRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const handlePosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('ポスターは10MB以下にしてください'); return }
    setPosterFile(file); setPosterPreview(URL.createObjectURL(file))
  }
  const handlePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024)
    const combined = [...photoFiles, ...valid].slice(0, 8)
    setPhotoFiles(combined); setPhotoPreviews(combined.map(f => URL.createObjectURL(f)))
    e.target.value = ''
  }
  const removePhoto = (i: number) => {
    setPhotoFiles(prev => prev.filter((_, j) => j !== i))
    setPhotoPreviews(prev => prev.filter((_, j) => j !== i))
  }

  // 主催者情報
  const [organizerCompany, setOrganizerCompany] = useState('')
  const [organizerContactName, setOrganizerContactName] = useState('')
  const [organizerPhone, setOrganizerPhone] = useState('')
  const [organizerEmail, setOrganizerEmail] = useState('')

  // 開発用アカウント（バリデーションスキップ）
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email ?? null))
  }, [])
  const isDevAccount = currentUserEmail?.endsWith('@test.com') ?? false

  // Step 1 バリデーション
  const validateStep1 = () => {
    if (isDevAccount) return true
    if (!title.trim()) { setError('イベント名を入力してください'); return false }
    if (dates.length === 0) { setError('開催日を1日以上選択してください'); return false }
    if (!prefecture.trim()) { setError('都道府県を入力してください'); return false }
    if (!location.trim()) { setError('会場・住所を入力してください'); return false }
    return true
  }

  const goNext = () => {
    setError(null)
    if (validateStep1()) { setStep(2); window.scrollTo(0, 0) }
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    // Step 2 バリデーション（公開時のみ主催者情報必須、開発アカウントはスキップ）
    if (status === 'published' && !isDevAccount) {
      if (!organizerCompany.trim()) { setError('会社名を入力してください'); return }
      if (!organizerContactName.trim()) { setError('担当者名を入力してください'); return }
      if (!organizerPhone.trim()) { setError('携帯電話番号を入力してください'); return }
      if (!organizerEmail.trim()) { setError('メールアドレスを入力してください'); return }
    }

    setLoading(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const sortedDates = [...dates].sort()
    const fallbackDate = new Date().toISOString().split('T')[0]

    const { data: event, error: eventError } = await supabase.from('events').insert({
      organizer_id: user.id,
      title: title || 'テストイベント',
      date: sortedDates[0] ?? fallbackDate,
      dates: sortedDates.length > 0 ? sortedDates : [fallbackDate],
      start_time: startTime || null,
      end_time: endTime || null,
      location,
      prefecture,
      expected_visitors: expectedVisitors ? parseInt(expectedVisitors) : null,
      total_slots: parseInt(totalSlots),
      fee: parseInt(fee),
      has_power: hasPower,
      has_water: hasWater,
      has_parking: hasParking,
      has_drainage: hasDrainage,
      generator_ok: generatorOk,
      is_indoor: isIndoor,
      vendor_type: vendorType,
      ground_type: groundType,
      has_waste_disposal: hasWasteDisposal,
      alcohol_ok: alcoholOk,
      custom_facility_tags: customFacilityTags,
      custom_env_tags: customEnvTags,
      apply_deadline: applyDeadline || null,
      description: description || null,
      organizer_company: organizerCompany || null,
      organizer_contact_name: organizerContactName || null,
      organizer_phone: organizerPhone || null,
      organizer_email: organizerEmail || null,
      status,
    }).select().single()

    if (eventError) {
      const msg = eventError.message
      if (msg.includes('date')) setError('開催日を入力してください')
      else if (msg.includes('title')) setError('イベント名を入力してください')
      else if (msg.includes('duplicate')) setError('同じイベントがすでに存在します')
      else setError('保存に失敗しました。入力内容を確認して再試行してください。')
      setLoading(false); return
    }

    // ジャンル枠
    const validSlots = genreSlots.filter(s => s.genre.trim() !== '')
    if (validSlots.length > 0) {
      const { error: slotError } = await supabase.from('event_genre_slots').insert(
        validSlots.map(s => ({ event_id: event.id, genre: s.genre, max_count: s.max_count }))
      )
      if (slotError) { setError('ジャンル枠の作成に失敗しました'); setLoading(false); return }
    }

    // 画像アップロード
    const uploadUpdates: { poster_url?: string; event_photo_urls?: string[] } = {}
    if (posterFile) {
      const ext = posterFile.name.split('.').pop()
      const { data: up } = await supabase.storage.from('event-images').upload(`${event.id}/poster.${ext}`, posterFile, { upsert: true })
      if (up) {
        const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(up.path)
        uploadUpdates.poster_url = publicUrl
      }
    }
    if (photoFiles.length > 0) {
      const urls: string[] = []
      for (let i = 0; i < photoFiles.length; i++) {
        const f = photoFiles[i]; const ext = f.name.split('.').pop()
        const { data: up } = await supabase.storage.from('event-images').upload(`${event.id}/photo_${i}.${ext}`, f, { upsert: true })
        if (up) { const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(up.path); urls.push(publicUrl) }
      }
      uploadUpdates.event_photo_urls = urls
    }
    if (Object.keys(uploadUpdates).length > 0) await supabase.from('events').update(uploadUpdates).eq('id', event.id)

    router.push('/events'); router.refresh()
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white'

  return (
    <div className="light-theme flex h-screen overflow-hidden bg-gray-50">
      <OrganizerSidebarNav nameChar="主" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/events" className="text-xs text-gray-400 hover:text-gray-600">イベント一覧</Link>
            <span className="text-gray-300 text-xs">/</span>
            <span className="text-xs text-gray-700 font-medium">新規イベント作成</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">イベントを作成</h1>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${step === 1 ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'}`}>1</div>
            <span className={`text-sm ${step === 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>基本情報・設備</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${step === 2 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
            <span className={`text-sm ${step === 2 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>画像・主催者情報</span>
          </div>
        </div>

        <div className="space-y-8">

          {/* ===== STEP 1 ===== */}
          {step === 1 && <>

            {/* 基本情報 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">基本情報</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">イベント名 *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="〇〇フェス2025" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開催日 *</label>
                <div className="flex gap-2">
                  <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button type="button"
                    onClick={() => { if (dateInput && !dates.includes(dateInput)) { setDates(p => [...p, dateInput].sort()); setDateInput('') } }}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-lg transition-colors">
                    追加
                  </button>
                </div>
                {dates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dates.map(d => (
                      <span key={d} className="flex items-center gap-1.5 text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                        {d}
                        <button type="button" onClick={() => setDates(p => p.filter(x => x !== d))} className="text-green-400 hover:text-red-500">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                  <select value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass}>
                    <option value="">--:--</option>
                    {Array.from({ length: 34 }, (_, i) => {
                      const totalMins = (6 * 60) + i * 30
                      const h = String(Math.floor(totalMins / 60)).padStart(2, '0')
                      const m = totalMins % 60 === 0 ? '00' : '30'
                      return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                  <select value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass}>
                    <option value="">--:--</option>
                    {Array.from({ length: 34 }, (_, i) => {
                      const totalMins = (6 * 60) + i * 30
                      const h = String(Math.floor(totalMins / 60)).padStart(2, '0')
                      const m = totalMins % 60 === 0 ? '00' : '30'
                      return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">応募締切</label>
                <input type="date" value={applyDeadline} onChange={e => setApplyDeadline(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">都道府県 *</label>
                <input type="text" value={prefecture} onChange={e => setPrefecture(e.target.value)} className={inputClass} placeholder="神奈川県" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会場・住所 *</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="横浜市中区〇〇公園" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">想定来場者数</label>
                  <input type="number" value={expectedVisitors} onChange={e => setExpectedVisitors(e.target.value)} min="0" step="500" className={inputClass} placeholder="1000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出店枠数 *</label>
                  <input type="number" value={totalSlots} onChange={e => setTotalSlots(e.target.value)} min="1" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">出店料（円）</label>
                <input type="number" value={fee} onChange={e => setFee(e.target.value)} min="0" step="1000" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">イベント説明</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className={inputClass} placeholder="イベントの詳細や雰囲気を記載してください" />
              </div>
            </section>

            {/* ジャンル枠 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">ジャンル枠</h2>
                <button type="button" onClick={addGenreSlot} className="text-sm text-green-600 font-medium">＋ 追加</button>
              </div>
              <p className="text-xs text-gray-400">同じジャンルの出店数を制限できます</p>
              {genreSlots.map((slot, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <select value={slot.genre} onChange={e => updateGenreSlot(i, 'genre', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">ジャンルを選択</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">最大</span>
                    <input type="number" value={slot.max_count} onChange={e => updateGenreSlot(i, 'max_count', parseInt(e.target.value))} min="1"
                      className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 text-center bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <span className="text-sm text-gray-500">台</span>
                  </div>
                  {genreSlots.length > 1 && (
                    <button type="button" onClick={() => removeGenreSlot(i)} className="text-gray-400 hover:text-red-500">✕</button>
                  )}
                </div>
              ))}
            </section>

            {/* 設備 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900">設備</h2>
              {[
                { label: '電源あり', value: hasPower, setter: setHasPower },
                { label: '水道あり', value: hasWater, setter: setHasWater },
                { label: '駐車場あり', value: hasParking, setter: setHasParking },
                { label: '排水設備あり', value: hasDrainage, setter: setHasDrainage },
                { label: '発電機持込可', value: generatorOk, setter: setGeneratorOk },
              ].map(({ label, value, setter }) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={value} onChange={e => setter(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">その他の設備を追加</p>
                <div className="flex gap-2">
                  <input type="text" value={customFacilityInput} onChange={e => setCustomFacilityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(customFacilityInput, customFacilityTags, setCustomFacilityTags, setCustomFacilityInput))}
                    placeholder="例：Wi-Fi完備、更衣室あり"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button type="button" onClick={() => addTag(customFacilityInput, customFacilityTags, setCustomFacilityTags, setCustomFacilityInput)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-lg transition-colors">追加</button>
                </div>
                {customFacilityTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customFacilityTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag, customFacilityTags, setCustomFacilityTags)} className="text-gray-400 hover:text-red-500">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 環境 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">環境</h2>
              <div className="flex flex-col gap-3">
                {[
                  { label: '屋内会場', value: isIndoor, setter: setIsIndoor },
                  { label: 'ゴミ処理あり（主催者が回収）', value: hasWasteDisposal, setter: setHasWasteDisposal },
                  { label: 'アルコール販売可', value: alcoholOk, setter: setAlcoholOk },
                ].map(({ label, value, setter }) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={value} onChange={e => setter(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">出店形式</p>
                <div className="flex gap-3">
                  {([{ value: 'kitchen_car_only', label: 'キッチンカーのみ' }, { value: 'tent_ok', label: 'テント出店可' }] as const).map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="vendor_type" value={opt.value} checked={vendorType === opt.value} onChange={() => setVendorType(opt.value)} className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">地面</p>
                <div className="flex gap-3">
                  {([{ value: 'asphalt', label: '舗装路面（アスファルト等）' }, { value: 'grass', label: '土・芝生' }] as const).map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ground_type" value={opt.value} checked={groundType === opt.value} onChange={() => setGroundType(opt.value)} className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">その他の環境情報を追加</p>
                <div className="flex gap-2">
                  <input type="text" value={customEnvInput} onChange={e => setCustomEnvInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(customEnvInput, customEnvTags, setCustomEnvTags, setCustomEnvInput))}
                    placeholder="例：ステージ隣接、川沿い、ドッグラン併設"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button type="button" onClick={() => addTag(customEnvInput, customEnvTags, setCustomEnvTags, setCustomEnvInput)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-lg transition-colors">追加</button>
                </div>
                {customEnvTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customEnvTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag, customEnvTags, setCustomEnvTags)} className="text-gray-400 hover:text-red-500">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button type="button" onClick={goNext}
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 text-sm font-medium transition-colors">
              次へ：画像・主催者情報
            </button>
          </>}

          {/* ===== STEP 2 ===== */}
          {step === 2 && <>

            {/* 画像 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">画像</h2>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">募集ポスター</p>
                <div onClick={() => posterRef.current?.click()}
                  className="w-full h-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-green-500 transition-colors">
                  {posterPreview ? (
                    <img src={posterPreview} alt="poster" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-400">クリックして画像を選択</p>
                      <p className="text-xs text-gray-300 mt-1">JPG・PNG・WEBP（10MB以下）</p>
                    </div>
                  )}
                </div>
                {posterPreview && (
                  <button type="button" onClick={() => { setPosterFile(null); setPosterPreview(null) }}
                    className="mt-2 text-xs text-gray-400 hover:text-red-500">削除</button>
                )}
                <input ref={posterRef} type="file" accept="image/*" onChange={handlePosterSelect} className="hidden" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">過去の開催写真 <span className="text-gray-400 font-normal">（最大8枚）</span></p>
                  {photoFiles.length < 8 && (
                    <button type="button" onClick={() => photosRef.current?.click()} className="text-sm text-green-600 font-medium">追加</button>
                  )}
                </div>
                {photoPreviews.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {photoPreviews.map((src, i) => (
                      <div key={i} className="relative aspect-square">
                        <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 text-xs shadow">
                          ✕
                        </button>
                      </div>
                    ))}
                    {photoFiles.length < 8 && (
                      <div onClick={() => photosRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
                        <span className="text-gray-400 text-xl">+</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div onClick={() => photosRef.current?.click()}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
                    <p className="text-sm text-gray-400">クリックして写真を選択（複数可）</p>
                  </div>
                )}
                <input ref={photosRef} type="file" accept="image/*" multiple onChange={handlePhotosSelect} className="hidden" />
              </div>
            </section>

            {/* 主催者情報 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">主催者情報 <span className="text-sm font-normal text-gray-400">（公開時必須）</span></h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会社名 *</label>
                <input type="text" value={organizerCompany} onChange={e => setOrganizerCompany(e.target.value)} className={inputClass} placeholder="〇〇株式会社" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当者名 *</label>
                <input type="text" value={organizerContactName} onChange={e => setOrganizerContactName(e.target.value)} className={inputClass} placeholder="山田 太郎" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当携帯電話番号 *</label>
                <input type="tel" value={organizerPhone} onChange={e => setOrganizerPhone(e.target.value)} className={inputClass} placeholder="090-0000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
                <input type="email" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} className={inputClass} placeholder="contact@example.com" />
              </div>
            </section>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => { setStep(1); setError(null); window.scrollTo(0, 0) }}
                className="flex-1 border border-gray-300 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                戻る
              </button>
              <button type="button" onClick={() => handleSubmit('draft')} disabled={loading}
                className="flex-1 border border-gray-300 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                下書き保存
              </button>
              <button type="button" onClick={() => handleSubmit('published')} disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-3 text-sm font-medium transition-colors">
                {loading ? '作成中...' : '公開する'}
              </button>
            </div>
          </>}

        </div>
          </div>
        </main>
      </div>
    </div>
  )
}
