import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SalesForm from './SalesForm'
import VendorBottomNav from '@/components/VendorBottomNav'

export default async function MySalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 売上記録を取得
  const { data: records } = await supabase
    .from('sales_records')
    .select('*')
    .eq('owner_id', user.id)
    .order('event_date', { ascending: false })

  // 承認済みの応募（フォームのリンク候補）
  const { data: myCars } = await supabase
    .from('kitchen_cars')
    .select('id, name')
    .eq('owner_id', user.id)

  const carIds = myCars?.map(c => c.id) ?? []
  const { data: approvedApps } = carIds.length > 0
    ? await supabase
        .from('applications')
        .select('id, kitchen_car_id, events(title, date)')
        .in('kitchen_car_id', carIds)
        .eq('status', 'approved')
        .order('applied_at', { ascending: false })
    : { data: [] }

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  const monthStr = `${thisYear}-${String(thisMonth).padStart(2, '0')}`

  const thisMonthRecords = (records ?? []).filter(r => r.event_date?.startsWith(monthStr))
  const totalThisMonth = thisMonthRecords.reduce((s, r) => s + (r.sales_amount ?? 0), 0)
  const totalCustomers = thisMonthRecords.reduce((s, r) => s + (r.customer_count ?? 0), 0)

  const allTotal = (records ?? []).reduce((s, r) => s + (r.sales_amount ?? 0), 0)

  // 月別集計（直近6ヶ月）
  const monthlyMap: Record<string, number> = {}
  for (let i = 0; i < 6; i++) {
    const d = new Date(thisYear, now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = 0
  }
  for (const r of records ?? []) {
    const key = r.event_date?.slice(0, 7)
    if (key && key in monthlyMap) {
      monthlyMap[key] += r.sales_amount ?? 0
    }
  }
  const monthlyEntries = Object.entries(monthlyMap).sort((a, b) => a[0].localeCompare(b[0]))
  const maxMonthly = Math.max(...monthlyEntries.map(e => e[1]), 1)

  const formatYen = (n: number) => {
    if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万円`
    return `¥${n.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-slate-100">売上管理</h1>
        <p className="text-xs text-slate-400 mt-0.5">出店売上の記録・集計</p>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* 今月のサマリー */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-green-950/40 rounded-2xl p-4 text-center col-span-1">
            <p className="text-xl font-bold text-green-400">{formatYen(totalThisMonth)}</p>
            <p className="text-xs text-slate-400 mt-1">今月の売上</p>
            <p className="text-xs text-slate-500 mt-0.5">{thisMonthRecords.length}イベント計</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-xl font-bold text-slate-100">{thisMonthRecords.length}<span className="text-sm font-normal text-slate-400 ml-0.5">件</span></p>
            <p className="text-xs text-slate-400 mt-1">今月の出店</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-xl font-bold text-slate-100">
              {totalCustomers > 0 ? totalCustomers.toLocaleString() : '-'}
              {totalCustomers > 0 && <span className="text-sm font-normal text-slate-400 ml-0.5">人</span>}
            </p>
            <p className="text-xs text-slate-400 mt-1">今月の来客</p>
          </div>
        </section>

        {/* 累計 + 分析リンク */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">累計売上</p>
            <p className="text-lg font-bold text-slate-100 mt-0.5">{formatYen(allTotal)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">記録件数</p>
              <p className="text-lg font-bold text-slate-100 mt-0.5">{(records ?? []).length}件</p>
            </div>
            <Link href="/my-sales/analytics" className="flex flex-col items-center gap-1 bg-green-950/40 border border-green-900/60 rounded-xl px-3 py-2 hover:bg-green-950/60 transition-colors">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="text-xs text-green-400 font-medium">分析</span>
            </Link>
          </div>
        </div>

        {/* 月別バーチャート */}
        {monthlyEntries.some(([, v]) => v > 0) && (
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <h2 className="text-sm font-medium text-slate-300 mb-4">月別売上（直近6ヶ月）</h2>
            <div className="flex items-end gap-2 h-24">
              {monthlyEntries.map(([month, val]) => {
                const pct = (val / maxMonthly) * 100
                const isThisMonth = month === monthStr
                const label = month.slice(5) + '月'
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-slate-400 text-center leading-none">
                      {val > 0 ? (val >= 10000 ? `${Math.floor(val / 10000)}万` : `${(val / 1000).toFixed(0)}k`) : ''}
                    </p>
                    <div className="w-full flex items-end" style={{ height: '64px' }}>
                      <div
                        className={`w-full rounded-t-md transition-all ${isThisMonth ? 'bg-green-500' : 'bg-slate-600'}`}
                        style={{ height: pct > 0 ? `${Math.max(pct, 8)}%` : '2px', opacity: pct > 0 ? 1 : 0.3 }}
                      />
                    </div>
                    <p className={`text-xs ${isThisMonth ? 'text-green-400 font-medium' : 'text-slate-500'}`}>{label}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 売上記録フォーム */}
        <SalesForm
          userId={user.id}
          applications={(approvedApps ?? []) as any}
          defaultKitchenCarId={myCars?.[0]?.id ?? null}
        />

        {/* 売上記録一覧 */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">売上記録</h2>
          {(!records || records.length === 0) ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center">
              <p className="text-slate-500 text-sm">まだ売上記録がありません</p>
              <p className="text-xs text-slate-600 mt-1">「売上を記録する」から追加しましょう</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(record => {
                const recMonth = record.event_date?.slice(0, 7)
                const isThisMonth = recMonth === monthStr
                return (
                  <div key={record.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isThisMonth && (
                            <span className="text-xs bg-green-950/50 text-green-400 px-2 py-0.5 rounded-full">今月</span>
                          )}
                          <p className="text-xs text-slate-500">{record.event_date}</p>
                        </div>
                        <p className="font-semibold text-slate-100 text-sm truncate">{record.event_name}</p>
                        {record.notes && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{record.notes}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-400 text-base">{formatYen(record.sales_amount)}</p>
                        {record.customer_count && (
                          <p className="text-xs text-slate-500 mt-0.5">{record.customer_count.toLocaleString()}人</p>
                        )}
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
