'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import VendorBottomNav from '@/components/VendorBottomNav'

const AREA_FILTERS = ['すべて', '北海道', '東北', '関東', '中部', '関西', '中国・四国', '九州']
const TYPE_FILTERS = ['音楽フェス', 'マルシェ', 'スポーツ', 'グルメ', '地域祭り']
const GENRE_FILTERS = [
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

export default function BrowseClient({
  events,
  appliedEventIds,
}: {
  events: any[]
  appliedEventIds: Set<string>
}) {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [area, setArea] = useState('すべて')
  const [type, setType] = useState<string | null>(null)
  const [genre, setGenre] = useState<string | null>(null)
  const [hasPower, setHasPower] = useState(false)
  const [hasWater, setHasWater] = useState(false)
  const [hasParking, setHasParking] = useState(false)
  const [hasDrainage, setHasDrainage] = useState(false)
  const [generatorOk, setGeneratorOk] = useState(false)
  const [isIndoor, setIsIndoor] = useState(false)
  const [vendorType, setVendorType] = useState<string | null>(null)
  const [groundType, setGroundType] = useState<string | null>(null)
  const [hasWasteDisposal, setHasWasteDisposal] = useState(false)
  const [alcoholOk, setAlcoholOk] = useState(false)

  const filtered = useMemo(() => {
    return events.filter(ev => {
      if (search && !ev.title?.includes(search) && !ev.location?.includes(search) && !ev.prefecture?.includes(search)) return false
      if (area !== 'すべて' && !ev.prefecture?.includes(area)) return false
      if (type && ev.event_type !== type) return false
      if (genre) {
        const slots = ev.event_genre_slots ?? []
        if (!slots.some((s: any) => s.genre === genre)) return false
      }
      if (hasPower && !ev.has_power) return false
      if (hasWater && !ev.has_water) return false
      if (hasParking && !ev.has_parking) return false
      if (hasDrainage && !ev.has_drainage) return false
      if (generatorOk && !ev.generator_ok) return false
      if (isIndoor && !ev.is_indoor) return false
      if (vendorType && ev.vendor_type !== vendorType) return false
      if (groundType && ev.ground_type !== groundType) return false
      if (hasWasteDisposal && !ev.has_waste_disposal) return false
      if (alcoholOk && !ev.alcohol_ok) return false
      return true
    })
  }, [events, search, area, type, genre, hasPower, hasWater, hasParking, hasDrainage, generatorOk, isIndoor, vendorType])

  const activeFilters = [
    area !== 'すべて' ? area : null,
    type,
    genre,
    hasPower ? '電源あり' : null,
    hasWater ? '水道あり' : null,
    hasParking ? '駐車場あり' : null,
    hasDrainage ? '排水設備あり' : null,
    generatorOk ? '発電機持込可' : null,
    isIndoor ? '屋内会場' : null,
    vendorType === 'tent_ok' ? 'テント可' : null,
    groundType === 'asphalt' ? '舗装路面' : groundType === 'grass' ? '土・芝生' : null,
    hasWasteDisposal ? 'ゴミ処理あり' : null,
    alcoholOk ? 'アルコール販売可' : null,
  ].filter(Boolean)

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 pt-4 pb-3 shrink-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-slate-100">イベントを探す</h1>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
              filtersOpen || activeFilters.length > 0
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {activeFilters.length > 0 ? `絞り込み中 ${activeFilters.length}` : 'フィルター'}
          </button>
        </div>

        {/* 検索バー */}
        <div className="flex gap-2 mb-1">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="エリア・イベント名で検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>

        {/* フィルター（折りたたみ） */}
        {filtersOpen && <>

        {/* エリアフィルター */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {AREA_FILTERS.map(a => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                area === a
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* イベントタイプ */}
        <div className="flex gap-2 overflow-x-auto pt-2 scrollbar-hide">
          {TYPE_FILTERS.map(t => (
            <button key={t} onClick={() => setType(type === t ? null : t)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                type === t ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* ジャンルフィルター */}
        <div className="flex gap-2 overflow-x-auto pt-2 scrollbar-hide">
          {GENRE_FILTERS.map(g => (
            <button key={g} onClick={() => setGenre(genre === g ? null : g)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                genre === g ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}>
              {g}
            </button>
          ))}
        </div>

        {/* 設備フィルター */}
        <div className="flex gap-2 pt-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { label: '電源あり', active: hasPower, toggle: () => setHasPower(p => !p) },
            { label: '水道あり', active: hasWater, toggle: () => setHasWater(w => !w) },
            { label: '駐車場あり', active: hasParking, toggle: () => setHasParking(p => !p) },
            { label: '排水設備あり', active: hasDrainage, toggle: () => setHasDrainage(d => !d) },
            { label: '発電機持込可', active: generatorOk, toggle: () => setGeneratorOk(g => !g) },
          ].map(({ label, active, toggle }) => (
            <button key={label} onClick={toggle}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                active ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* 環境フィルター */}
        <div className="flex gap-2 pt-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setIsIndoor(i => !i)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              isIndoor ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            屋内会場
          </button>
          <button onClick={() => setVendorType(v => v === 'tent_ok' ? null : 'tent_ok')}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              vendorType === 'tent_ok' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            テント出店可
          </button>
          <button onClick={() => setGroundType(g => g === 'asphalt' ? null : 'asphalt')}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              groundType === 'asphalt' ? 'bg-slate-400 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            舗装路面
          </button>
          <button onClick={() => setGroundType(g => g === 'grass' ? null : 'grass')}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              groundType === 'grass' ? 'bg-green-700 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            土・芝生
          </button>
          <button onClick={() => setHasWasteDisposal(w => !w)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              hasWasteDisposal ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            ゴミ処理あり
          </button>
          <button onClick={() => setAlcoholOk(a => !a)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              alcoholOk ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            アルコール販売可
          </button>
        </div>
        </>}
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 py-3 max-w-lg mx-auto w-full">
        {/* 件数・絞り込み表示 */}
        <div className="mb-3">
          <p className="text-xs text-slate-400">
            <span className="text-slate-200 font-medium">{filtered.length}件</span>のイベントが見つかりました
            {activeFilters.length > 0 && (
              <span className="text-slate-500"> · {activeFilters.join('、')} で絞り込み中</span>
            )}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎪</div>
            <p className="text-slate-400">条件に合うイベントはありません</p>
            <button
              onClick={() => { setSearch(''); setArea('すべて'); setType(null); setGenre(null); setHasPower(false); setHasWater(false); setHasParking(false); setHasDrainage(false); setGeneratorOk(false); setIsIndoor(false); setVendorType(null); setGroundType(null); setHasWasteDisposal(false); setAlcoholOk(false) }}
              className="mt-3 text-sm text-green-400 underline"
            >
              絞り込みをリセット
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(event => {
              const applied = appliedEventIds.has(event.id)
              const slots = event.event_genre_slots ?? []
              const totalApproved = slots.reduce((sum: number, s: any) => sum + (s.approved_count ?? 0), 0)
              const remaining = event.total_slots - totalApproved
              const days = event.apply_deadline ? daysUntil(event.apply_deadline) : null

              return (
                <div
                  key={event.id}
                  className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
                >
                  {/* ポスター画像 */}
                  {event.poster_url && (
                    <img src={event.poster_url} alt={event.title} className="w-full h-40 object-cover" />
                  )}

                  <div className="p-4 space-y-3">
                  {/* タイトル行 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {applied && (
                          <span className="text-xs font-medium bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full">応募済み</span>
                        )}
                        {remaining <= 3 && remaining > 0 && (
                          <span className="text-xs font-medium bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded-full">枠残{remaining}</span>
                        )}
                        {remaining === 0 && (
                          <span className="text-xs font-medium bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">満枠</span>
                        )}
                      </div>
                      <h2 className="font-semibold text-slate-100 text-base leading-snug">{event.title}</h2>
                    </div>
                  </div>

                  {/* 日時・場所 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {(() => {
                          const ds: string[] = event.dates?.length ? [...event.dates].sort() : event.date ? [event.date] : []
                          if (ds.length === 0) return '日程未定'
                          if (ds.length === 1) return ds[0]
                          return `${ds[0]} 〜 ${ds[ds.length - 1]}（${ds.length}日間）`
                        })()}
                        {event.start_time ? ` ${event.start_time.slice(0,5)}〜${event.end_time?.slice(0,5) ?? ''}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{event.prefecture} · {event.location}</span>
                    </div>
                  </div>

                  {/* 3カラム統計 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-bold text-slate-100">
                        {event.fee === 0 ? '無料' : `¥${event.fee?.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">出店料</p>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-bold text-slate-100">
                        {event.expected_visitors ? `${event.expected_visitors.toLocaleString()}人` : '-'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">想定来場者</p>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-bold text-slate-100">{event.total_slots}枠</p>
                      <p className="text-xs text-slate-500 mt-0.5">出店枠</p>
                    </div>
                  </div>

                  {/* ジャンル枠 */}
                  {slots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {slots.map((slot: any) => {
                        const rem = slot.max_count - (slot.approved_count ?? 0)
                        const full = rem <= 0
                        return (
                          <span
                            key={slot.id}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              full
                                ? 'bg-slate-700 text-slate-500 line-through'
                                : 'bg-green-950/50 text-green-400 border border-green-900/60'
                            }`}
                          >
                            {slot.genre}{full ? '（満了）' : `（残${rem}）`}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* 設備・環境タグ */}
                  {(event.has_power || event.has_water || event.has_parking || event.has_drainage || event.generator_ok || event.is_indoor || event.vendor_type) && (
                    <div className="flex gap-1.5 flex-wrap">
                      {event.has_power && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">電源</span>}
                      {event.has_water && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">水道</span>}
                      {event.has_parking && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">駐車場</span>}
                      {event.has_drainage && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">排水設備</span>}
                      {event.generator_ok && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">発電機持込可</span>}
                      {event.is_indoor && <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-1 rounded-lg">屋内会場</span>}
                      {event.vendor_type === 'tent_ok' && <span className="text-xs bg-orange-900/40 text-orange-400 px-2 py-1 rounded-lg">テント可</span>}
                      {event.vendor_type === 'kitchen_car_only' && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-lg">車両のみ</span>}
                      {event.ground_type === 'grass' && <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded-lg">土・芝生</span>}
                      {event.has_waste_disposal && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">ゴミ処理あり</span>}
                      {event.alcohol_ok && <span className="text-xs bg-purple-900/40 text-purple-400 px-2 py-1 rounded-lg">酒類販売可</span>}
                      {event.custom_facility_tags?.map((tag: string) => (
                        <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">{tag}</span>
                      ))}
                      {event.custom_env_tags?.map((tag: string) => (
                        <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* 締切 */}
                  {event.apply_deadline && (
                    <p className={`text-xs font-medium ${days !== null && days <= 7 ? 'text-orange-400' : 'text-slate-500'}`}>
                      応募締切 {event.apply_deadline}
                      {days !== null && days >= 0 && ` · あと${days}日`}
                      {days !== null && days < 0 && ' · 締切済み'}
                    </p>
                  )}

                  {/* ボタン */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/browse/${event.id}`}
                      className="flex-1 text-center text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl transition-colors"
                    >
                      詳細を見る
                    </Link>
                    <Link
                      href={`/browse/${event.id}`}
                      className={`flex-1 text-center text-sm font-medium py-2.5 rounded-xl transition-colors ${
                        applied
                          ? 'bg-blue-900/40 text-blue-400'
                          : remaining === 0
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {applied ? '応募済み' : remaining === 0 ? '満枠' : '応募する'}
                    </Link>
                  </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <VendorBottomNav />
    </div>
  )
}
