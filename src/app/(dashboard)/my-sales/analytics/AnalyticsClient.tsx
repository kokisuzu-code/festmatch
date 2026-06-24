'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import VendorBottomNav from '@/components/VendorBottomNav'

type SalesRecord = {
  id: string
  event_name: string
  event_date: string
  sales_amount: number
  customer_count: number | null
  weather: 'sunny' | 'cloudy' | 'rainy' | null
  notes: string | null
  vendors?: { genre: string } | null
}

const PERIODS = [
  { label: '3ヶ月', months: 3 },
  { label: '6ヶ月', months: 6 },
  { label: '1年', months: 12 },
]

const WEATHER_LABEL: Record<string, string> = { sunny: '晴れ', cloudy: '曇り', rainy: '雨' }
const WEATHER_ICON: Record<string, string> = { sunny: '☀️', cloudy: '☁️', rainy: '🌧️' }

const CHART_COLOR = '#22c55e'
const CHART_AVG_COLOR = '#64748b'
const DONUT_COLORS = ['#22c55e', '#4ade80', '#86efac', '#94a3b8', '#64748b']

export default function AnalyticsClient({ records, kitchenCarGenre }: { records: SalesRecord[]; kitchenCarGenre: string | null }) {
  const [periodIdx, setPeriodIdx] = useState(1)
  const barRef = useRef<HTMLCanvasElement>(null)
  const donutRef = useRef<HTMLCanvasElement>(null)
  const barChartRef = useRef<any>(null)
  const donutChartRef = useRef<any>(null)

  const period = PERIODS[periodIdx]
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - period.months)
  cutoff.setDate(1)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const filtered = useMemo(() =>
    records.filter(r => r.event_date >= cutoffStr),
    [records, cutoffStr]
  )

  const totalSales = filtered.reduce((s, r) => s + r.sales_amount, 0)
  const count = filtered.length
  const avg = count > 0 ? Math.round(totalSales / count) : 0
  const maxRecord = filtered.reduce((m, r) => r.sales_amount > (m?.sales_amount ?? 0) ? r : m, filtered[0] ?? null)

  // 前期比
  const prevCutoff = new Date(cutoff)
  prevCutoff.setMonth(prevCutoff.getMonth() - period.months)
  const prevCutoffStr = prevCutoff.toISOString().split('T')[0]
  const prev = records.filter(r => r.event_date >= prevCutoffStr && r.event_date < cutoffStr)
  const prevTotal = prev.reduce((s, r) => s + r.sales_amount, 0)
  const prevCount = prev.length
  const salesDiff = prevTotal > 0 ? Math.round(((totalSales - prevTotal) / prevTotal) * 100) : null
  const countDiff = prevCount > 0 ? count - prevCount : null

  // 月別集計
  const monthlyMap: Record<string, number> = {}
  const now = new Date()
  for (let i = period.months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = 0
  }
  for (const r of filtered) {
    const key = r.event_date.slice(0, 7)
    if (key in monthlyMap) monthlyMap[key] += r.sales_amount
  }
  const monthLabels = Object.keys(monthlyMap).sort().map(k => `${parseInt(k.slice(5))}月`)
  const monthData = Object.keys(monthlyMap).sort().map(k => Math.round(monthlyMap[k] / 10000))
  const avgVal = monthData.length > 0 ? Math.round(monthData.reduce((a, b) => a + b, 0) / monthData.length) : 0

  // 天気別
  const weatherMap: Record<string, { total: number; count: number }> = {
    sunny: { total: 0, count: 0 },
    cloudy: { total: 0, count: 0 },
    rainy: { total: 0, count: 0 },
  }
  for (const r of filtered) {
    if (r.weather && r.weather in weatherMap) {
      weatherMap[r.weather].total += r.sales_amount
      weatherMap[r.weather].count++
    }
  }
  const sunnyAvg = weatherMap.sunny.count > 0 ? weatherMap.sunny.total / weatherMap.sunny.count : 0
  const rainyAvg = weatherMap.rainy.count > 0 ? weatherMap.rainy.total / weatherMap.rainy.count : 0
  const rainPct = sunnyAvg > 0 ? Math.round((rainyAvg / sunnyAvg) * 100) : null

  // ジャンル別（vendorsのgenreまたはevent_nameでざっくり）
  const genreMap: Record<string, number> = {}
  for (const r of filtered) {
    const genre = (r.vendors as any)?.genre ?? kitchenCarGenre ?? 'その他'
    genreMap[genre] = (genreMap[genre] ?? 0) + r.sales_amount
  }
  const genreEntries = Object.entries(genreMap).sort((a, b) => b[1] - a[1])
  const totalGenre = genreEntries.reduce((s, [, v]) => s + v, 0)

  // イベントランキング
  const ranked = [...filtered].sort((a, b) => b.sales_amount - a.sales_amount).slice(0, 5)
  const maxSale = ranked[0]?.sales_amount ?? 1

  const formatYen = (n: number) => {
    if (n === 0) return '—'
    if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万円`
    return `¥${n.toLocaleString()}`
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    import('chart.js/auto').then(({ default: Chart }) => {
      // Bar chart
      if (barRef.current) {
        if (barChartRef.current) barChartRef.current.destroy()
        barChartRef.current = new Chart(barRef.current, {
          type: 'bar',
          data: {
            labels: monthLabels,
            datasets: [
              {
                label: '売上',
                data: monthData,
                backgroundColor: CHART_COLOR,
                borderRadius: 4,
                borderSkipped: false,
              },
              {
                label: '平均',
                data: Array(monthLabels.length).fill(avgVal),
                type: 'line' as any,
                borderColor: CHART_AVG_COLOR,
                borderDash: [4, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: { label: (ctx: any) => ctx.dataset.label + '：' + ctx.parsed.y + '万円' },
              },
            },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
              y: {
                ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v: any) => v + '万' },
                grid: { color: 'rgba(255,255,255,0.06)' },
                border: { display: false },
              },
            },
          },
        })
      }

      // Donut chart
      if (donutRef.current && genreEntries.length > 0) {
        if (donutChartRef.current) donutChartRef.current.destroy()
        donutChartRef.current = new Chart(donutRef.current, {
          type: 'doughnut',
          data: {
            labels: genreEntries.map(([k]) => k),
            datasets: [{
              data: genreEntries.map(([, v]) => v),
              backgroundColor: DONUT_COLORS,
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { legend: { display: false } },
          },
        })
      }
    })
    return () => {
      barChartRef.current?.destroy()
      donutChartRef.current?.destroy()
    }
  }, [periodIdx, records])

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/my-sales" className="text-slate-400 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-slate-100">売上分析</h1>
        </div>
        {/* 期間タブ */}
        <div className="flex border border-slate-600 rounded-xl overflow-hidden">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`text-xs px-3 py-1.5 font-medium transition-colors ${
                i === periodIdx ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* KPIカード */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">総売上（{period.label}）</p>
            <p className="text-2xl font-bold text-slate-100">{formatYen(totalSales)}</p>
            {salesDiff !== null && (
              <p className={`text-xs mt-1 font-medium ${salesDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {salesDiff >= 0 ? '▲' : '▼'} 前期比 {salesDiff >= 0 ? '+' : ''}{salesDiff}%
              </p>
            )}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">出店回数</p>
            <p className="text-2xl font-bold text-slate-100">{count}<span className="text-base font-normal text-slate-400 ml-0.5">回</span></p>
            {countDiff !== null && (
              <p className={`text-xs mt-1 font-medium ${countDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                前期比 {countDiff >= 0 ? '+' : ''}{countDiff}回
              </p>
            )}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">1回あたり平均</p>
            <p className="text-2xl font-bold text-slate-100">{formatYen(avg)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">最高売上</p>
            <p className="text-2xl font-bold text-slate-100">{maxRecord ? formatYen(maxRecord.sales_amount) : '—'}</p>
            {maxRecord && <p className="text-xs text-slate-500 mt-1 truncate">{maxRecord.event_name}</p>}
          </div>
        </section>

        {/* 月次売上推移 */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300">月次売上推移</h2>
            <span className="text-xs text-slate-500">万円</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />売上
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border border-dashed border-slate-500 inline-block" />平均
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-500 text-sm">データがありません</div>
          ) : (
            <div className="relative h-44">
              <canvas ref={barRef} />
            </div>
          )}
        </section>

        {/* 天気別 + ジャンル別 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 天気別 */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">天気別 平均売上</h2>
            <div className="space-y-2">
              {(['sunny', 'cloudy', 'rainy'] as const).map(w => {
                const d = weatherMap[w]
                const a = d.count > 0 ? Math.round(d.total / d.count) : null
                return (
                  <div key={w} className="bg-slate-900 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{WEATHER_ICON[w]}</span>
                      <span className="text-xs text-slate-400">{WEATHER_LABEL[w]}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-100">{a !== null ? formatYen(a) : '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{d.count}回</p>
                  </div>
                )
              })}
            </div>
            {rainPct !== null && (
              <div className="mt-3 bg-blue-950/40 border border-blue-900/40 rounded-xl p-2.5">
                <p className="text-xs text-blue-300 leading-relaxed">
                  💡 雨の日の売上は晴れの日の約{rainPct}%。天気予報が雨なら出店を再検討する余地あり。
                </p>
              </div>
            )}
          </section>

          {/* ジャンル別 */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">ジャンル別 売上構成</h2>
            {genreEntries.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-500 text-xs">データなし</div>
            ) : (
              <>
                <div className="relative h-32 mb-3">
                  <canvas ref={donutRef} />
                </div>
                <div className="space-y-1">
                  {genreEntries.map(([genre, val], i) => (
                    <div key={genre} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: DONUT_COLORS[i] ?? '#94a3b8' }} />
                      <span className="text-slate-300 truncate flex-1">{genre}</span>
                      <span className="text-slate-400 shrink-0">{Math.round((val / totalGenre) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* イベント別ランキング */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300">イベント別 実績ランキング</h2>
            <Link href="/browse" className="text-xs text-slate-400 border border-slate-600 px-2.5 py-1 rounded-lg hover:border-slate-500 transition-colors">
              再応募を探す →
            </Link>
          </div>
          {ranked.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">データがありません</p>
          ) : (
            <div className="space-y-0 divide-y divide-slate-700">
              {ranked.map((r, i) => {
                const pct = Math.round((r.sales_amount / maxSale) * 100)
                const isLow = r.sales_amount < avg * 0.5
                return (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-100 font-medium truncate">{r.event_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.event_date}
                        {r.customer_count ? ` · 来場${r.customer_count.toLocaleString()}人` : ''}
                        {r.weather ? ` · ${WEATHER_ICON[r.weather]}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${isLow ? 'text-slate-400' : 'text-slate-100'}`}>
                        {r.sales_amount.toLocaleString()}円
                      </p>
                      <div className="w-20 h-1 bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: isLow ? '#64748b' : CHART_COLOR }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <VendorBottomNav />
    </div>
  )
}
