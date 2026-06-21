'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VendorBottomNav from '@/components/VendorBottomNav'

type AppItem = {
  id: string
  status: 'pending' | 'approved' | 'declined' | 'cancelled'
  events: {
    id: string
    title: string
    date: string
    start_time: string | null
    end_time: string | null
    location: string
    prefecture: string
    fee: number
    has_power: boolean
    has_water: boolean
  } | null
}

const DOW = ['日', '月', '火', '水', '木', '金', '土']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

const STATUS_COLOR: Record<string, string> = {
  approved: 'bg-green-500',
  pending:  'bg-yellow-400',
  declined: 'bg-red-400',
  cancelled:'bg-slate-500',
}
const STATUS_PILL: Record<string, string> = {
  approved: 'bg-green-950/60 text-green-300',
  pending:  'bg-yellow-950/60 text-yellow-300',
  declined: 'bg-red-950/60 text-red-300',
  cancelled:'bg-slate-700 text-slate-400',
}
const STATUS_LABEL: Record<string, string> = {
  approved: '確定', pending: '審査中', declined: '見送り', cancelled: 'キャンセル',
}

export default function ScheduleClient({
  applications,
  thisMonthSales,
  salesCount,
}: {
  applications: AppItem[]
  thisMonthSales: number
  salesCount: number
}) {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [view, setView] = useState<'月' | 'リスト'>('月')
  const [cancelling, setCancelling] = useState<string | null>(null)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  // このビューに表示するアプリケーション
  const viewApps = view === '月'
    ? applications.filter(a => a.events?.date?.startsWith(monthStr))
    : applications.filter(a => {
        const d = a.events?.date
        return d && new Date(d) >= new Date(now.getFullYear(), now.getMonth(), 1)
      }).sort((a, b) => (a.events?.date ?? '').localeCompare(b.events?.date ?? ''))

  // カレンダー構築
  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()
  const prevLastDate = new Date(year, month, 0).getDate()

  const cells: { date: number; curMonth: boolean; dateStr: string }[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevLastDate - i
    const m2 = month === 0 ? 12 : month
    const y2 = month === 0 ? year - 1 : year
    cells.push({ date: d, curMonth: false, dateStr: `${y2}-${String(m2).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ date: d, curMonth: true, dateStr: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m2 = month === 11 ? 1 : month + 2
      const y2 = month === 11 ? year + 1 : year
      cells.push({ date: d, curMonth: false, dateStr: `${y2}-${String(m2).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
    }
  }

  // 日付→アプリケーションマップ
  const dateMap: Record<string, AppItem[]> = {}
  for (const app of applications) {
    const d = app.events?.date
    if (d) {
      if (!dateMap[d]) dateMap[d] = []
      dateMap[d].push(app)
    }
  }

  const todayStr = now.toISOString().split('T')[0]

  const approved = applications.filter(a => a.status === 'approved')
  const pending  = applications.filter(a => a.status === 'pending')
  const thisMonthApproved = approved.filter(a => a.events?.date?.startsWith(monthStr))

  const formatYen = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万円` : `¥${n.toLocaleString()}`

  const handleCancel = async (appId: string) => {
    if (!confirm('このイベントへの参加をキャンセル申請しますか？')) return
    setCancelling(appId)
    const supabase = createClient()
    await supabase.from('applications').update({ status: 'cancelled' }).eq('id', appId)
    setCancelling(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-base font-semibold text-slate-100">スケジュール</h1>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-600 rounded-xl overflow-hidden">
            {(['月', 'リスト'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 font-medium transition-colors ${
                  view === v ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Link
            href="/browse"
            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            応募する
          </Link>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* サマリー */}
        <section className="grid grid-cols-4 gap-2">
          {[
            { label: '確定出店', val: `${thisMonthApproved.length}件`, color: 'text-green-400', sub: '今月' },
            { label: '審査待ち', val: `${pending.length}件`, color: 'text-yellow-400', sub: '回答待ち' },
            { label: '今月の売上', val: thisMonthSales > 0 ? formatYen(thisMonthSales) : '—', color: 'text-slate-100', sub: `${salesCount}件入力済` },
            { label: '承認済み', val: `${approved.length}件`, color: 'text-blue-400', sub: '累計' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-2.5">
              <p className="text-xs text-slate-400 mb-1 leading-tight">{s.label}</p>
              <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </section>

        {view === '月' && (
          <>
            {/* 月ナビ */}
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-base font-semibold text-slate-100">{year}年 {MONTHS[month]}</span>
              <button onClick={nextMonth} className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* カレンダー */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 border-b border-slate-700 bg-slate-900">
                {DOW.map((d, i) => (
                  <div key={d} className={`text-center py-2 text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
                    {d}
                  </div>
                ))}
              </div>
              {/* 日付グリッド */}
              <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                  const dayApps = dateMap[cell.dateStr] ?? []
                  const isToday = cell.dateStr === todayStr
                  const col = idx % 7
                  return (
                    <div
                      key={idx}
                      className={`border-r border-b border-slate-700 min-h-16 p-1 ${!cell.curMonth ? 'opacity-30' : ''} ${col === 6 ? 'border-r-0' : ''}`}
                    >
                      <div className="flex justify-center mb-1">
                        <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-slate-100 text-slate-900 font-bold' :
                          col === 0 ? 'text-red-400' : col === 6 ? 'text-blue-400' : 'text-slate-400'
                        }`}>
                          {cell.date}
                        </span>
                      </div>
                      {dayApps.slice(0, 2).map(app => (
                        <div
                          key={app.id}
                          className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate leading-snug ${
                            app.status === 'approved' ? 'bg-green-950/70 text-green-300' :
                            app.status === 'pending' ? 'bg-yellow-950/70 text-yellow-300' :
                            'bg-slate-700 text-slate-400'
                          }`}
                          style={{ fontSize: '9px' }}
                        >
                          {app.events?.title}
                        </div>
                      ))}
                      {dayApps.length > 2 && (
                        <div className="text-slate-500" style={{ fontSize: '9px' }}>+{dayApps.length - 2}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 月イベント一覧 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-100">{MONTHS[month]}の出店一覧</h2>
                <span className="text-xs text-slate-400">{viewApps.length}件</span>
              </div>
              <EventList apps={viewApps} cancelling={cancelling} onCancel={handleCancel} />
            </div>
          </>
        )}

        {view === 'リスト' && (
          <div>
            <h2 className="text-sm font-medium text-slate-100 mb-3">今後の出店スケジュール</h2>
            <EventList apps={viewApps} cancelling={cancelling} onCancel={handleCancel} />
          </div>
        )}

        {/* 応募追加ボタン */}
        <Link
          href="/browse"
          className="w-full py-3 border border-dashed border-slate-600 rounded-2xl flex items-center justify-center gap-2 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          イベントに応募して出店を追加する →
        </Link>
      </main>

      <VendorBottomNav />
    </div>
  )
}

function EventList({ apps, cancelling, onCancel }: {
  apps: AppItem[]
  cancelling: string | null
  onCancel: (id: string) => void
}) {
  if (apps.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
        <p className="text-slate-500 text-sm">この期間の出店はありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {apps.map(app => {
        const ev = app.events
        if (!ev) return null
        const date = new Date(ev.date)
        const dayOfWeek = DOW[date.getDay()]
        return (
          <div key={app.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex">
            {/* ステータスライン */}
            <div className={`w-1 shrink-0 ${STATUS_COLOR[app.status] ?? 'bg-slate-500'}`} />

            <div className="flex-1 p-4 space-y-2">
              {/* タイトル + バッジ */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm leading-snug">{ev.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_PILL[app.status]}`}>
                  {STATUS_LABEL[app.status]}
                </span>
              </div>

              {/* メタ情報 */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {ev.date}（{dayOfWeek}）{ev.start_time ? ` ${ev.start_time.slice(0,5)}〜${ev.end_time?.slice(0,5) ?? ''}` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {ev.prefecture} · {ev.location}
                </span>
                <span>出店料 {ev.fee === 0 ? '無料' : `¥${ev.fee.toLocaleString()}`}</span>
              </div>

              {/* 設備（確定のみ） */}
              {app.status === 'approved' && (ev.has_power || ev.has_water) && (
                <div className="flex gap-2">
                  {ev.has_power && <span className="text-xs bg-yellow-950/40 text-yellow-400 px-2 py-0.5 rounded-lg">⚡ 電源</span>}
                  {ev.has_water && <span className="text-xs bg-blue-950/40 text-blue-400 px-2 py-0.5 rounded-lg">💧 給水</span>}
                </div>
              )}

              {/* 審査中メッセージ */}
              {app.status === 'pending' && (
                <p className="text-xs text-slate-500">主催者からの回答を待っています</p>
              )}

              {/* アクションボタン */}
              {(app.status === 'approved' || app.status === 'pending') && (
                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/messages/${app.id}`}
                    className="text-xs px-3 py-1.5 border border-slate-600 text-slate-300 rounded-lg hover:border-slate-500 transition-colors"
                  >
                    主催者にメッセージ
                  </Link>
                  {app.status === 'approved' && (
                    <Link
                      href="/my-sales"
                      className="text-xs px-3 py-1.5 border border-slate-600 text-slate-300 rounded-lg hover:border-slate-500 transition-colors"
                    >
                      売上を記録
                    </Link>
                  )}
                  <button
                    onClick={() => onCancel(app.id)}
                    disabled={cancelling === app.id}
                    className="text-xs px-3 py-1.5 border border-red-900/60 text-red-400 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50 ml-auto"
                  >
                    {cancelling === app.id ? '処理中…' : 'キャンセル'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
