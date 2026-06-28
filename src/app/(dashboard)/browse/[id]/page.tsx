export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ApplyButton from './ApplyButton'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('*, event_genre_slots(*)')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (!event) notFound()

  // 自分のキッチンカーを取得
  const { data: myCars } = await supabase
    .from('vendors')
    .select('*')
    .eq('owner_id', user.id)

  // 応募済みか確認
  const carIds = myCars?.map(c => c.id) ?? []
  const { data: existingApp } = carIds.length > 0
    ? await supabase
        .from('applications')
        .select('id, status, vendor_id')
        .eq('event_id', id)
        .in('vendor_id', carIds)
        .single()
    : { data: null }

  const slots = event.event_genre_slots ?? []

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/browse" className="text-slate-400 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-slate-100 truncate">{event.title}</h1>
      </header>

      {/* ポスター */}
      {event.poster_url && (
        <div className="bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-hidden">
          <img
            src={event.poster_url}
            alt={event.title}
            className="w-full max-h-[70vh] object-contain"
          />
        </div>
      )}

      {/* イベント写真 */}
      {event.event_photo_urls?.length > 0 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {event.event_photo_urls.map((url: string, i: number) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img src={url} alt="" className="w-28 h-28 object-cover rounded-xl border border-slate-700" />
            </a>
          ))}
        </div>
      )}

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
        {/* メイン情報 */}
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-3">
          <h2 className="text-xl font-bold text-slate-100">{event.title}</h2>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-slate-200">
              <span className="text-lg">📅</span>
              <div>
                <p className="font-medium">{event.date}</p>
                {event.start_time && (
                  <p className="text-sm text-slate-400">{event.start_time.slice(0,5)} 〜 {event.end_time?.slice(0,5)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <span className="text-lg">📍</span>
              <div>
                <p className="font-medium">{event.location}</p>
                <p className="text-sm text-slate-400">{event.prefecture}</p>
              </div>
            </div>
            {event.expected_visitors && (
              <div className="flex items-center gap-3 text-slate-200">
                <span className="text-lg">👥</span>
                <p className="font-medium">{event.expected_visitors.toLocaleString()}人 来場予定</p>
              </div>
            )}
          </div>

          {/* 設備 */}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-700">
            {event.has_power && <span className="text-sm bg-green-950/40 text-green-400 px-3 py-1.5 rounded-xl">⚡ 電源あり</span>}
            {event.has_water && <span className="text-sm bg-blue-950/40 text-blue-400 px-3 py-1.5 rounded-xl">💧 水道あり</span>}
            {event.has_parking && <span className="text-sm bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl">🅿️ 駐車場あり</span>}
          </div>
        </section>

        {/* 出店条件 */}
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
          <h3 className="font-semibold text-slate-100 mb-3">出店条件</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-100">{event.total_slots}</p>
              <p className="text-xs text-slate-400 mt-0.5">出店枠数</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-100">
                {event.fee === 0 ? '無料' : `¥${event.fee.toLocaleString()}`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">出店料</p>
            </div>
          </div>
          {event.apply_deadline && (
            <p className="text-sm text-orange-400 font-medium mt-3">
              ⏰ 応募締切: {event.apply_deadline}
            </p>
          )}
        </section>

        {/* ジャンル枠 */}
        {slots.length > 0 && (
          <section className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
            <h3 className="font-semibold text-slate-100 mb-3">ジャンル別枠数</h3>
            <div className="space-y-2">
              {slots.map((slot: any) => {
                const remaining = slot.max_count - slot.approved_count
                return (
                  <div key={slot.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-200">{slot.genre}</span>
                    <span className={`text-sm font-medium ${remaining === 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {remaining === 0 ? '満枠' : `残り${remaining}枠`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 説明 */}
        {event.description && (
          <section className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
            <h3 className="font-semibold text-slate-100 mb-2">イベント詳細</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </section>
        )}
      </main>

      {/* 固定下部：応募ボタン */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-4 py-4">
        <ApplyButton
          eventId={id}
          myCars={myCars ?? []}
          existingApp={existingApp}
          genreSlots={slots}
        />
      </div>
    </div>
  )
}
