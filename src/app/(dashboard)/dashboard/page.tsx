import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OrganizerSidebarNav from '@/components/OrganizerSidebarNav'
import VendorBottomNav from '@/components/VendorBottomNav'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isOrganizer = profile?.role === 'organizer'

  if (isOrganizer) {
    return <OrganizerDashboard user={user} profile={profile} supabase={supabase} />
  } else {
    return <VendorDashboard user={user} profile={profile} supabase={supabase} />
  }
}

async function OrganizerDashboard({ user, profile, supabase }: any) {
  const { data: events } = await supabase
    .from('events')
    .select('id, title, date, status, total_slots, event_genre_slots(*)')
    .eq('organizer_id', user.id)
    .order('date', { ascending: true })

  const eventIds = events?.map((e: any) => e.id) ?? []

  const { data: applications } = eventIds.length > 0
    ? await supabase
        .from('applications')
        .select('id, status, event_id, applied_at, kitchen_cars(name, genre, profiles(name))')
        .in('event_id', eventIds)
        .order('applied_at', { ascending: false })
    : { data: [] }

  const pending  = applications?.filter((a: any) => a.status === 'pending')  ?? []
  const approved = applications?.filter((a: any) => a.status === 'approved') ?? []

  const { count: unreadCount } = applications?.length > 0
    ? await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .in('application_id', applications.map((a: any) => a.id))
    : { count: 0 }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = (events ?? []).filter((e: any) => e.date >= today && e.status === 'published').slice(0, 4)
  const nameChar = (profile?.name ?? user.email ?? '?')[0].toUpperCase()

  // 審査待ちキッチンカー数
  const { count: pendingReviewCount } = await supabase
    .from('kitchen_cars')
    .select('id', { count: 'exact', head: true })
    .eq('verified_status', 'pending')

  return (
    <div className="light-theme flex h-screen overflow-hidden bg-gray-50">
      <OrganizerSidebarNav nameChar={nameChar} unreadCount={unreadCount ?? 0} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* トップバー */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-sm font-semibold text-gray-700">ホーム</h1>
          <Link
            href="/events/new"
            className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規イベント作成
          </Link>
        </header>

        <main className="flex-1 overflow-auto px-6 py-5 space-y-5">

          {/* KPIカード */}
          <section className="grid grid-cols-4 gap-3">
            {[
              { label: '開催予定イベント', val: upcoming.length, sub: '今月', valColor: 'text-gray-900', href: '/events' },
              { label: '新着応募', val: pending.length, sub: '要対応', valColor: pending.length > 0 ? 'text-amber-600' : 'text-gray-900', href: '/events' },
              { label: '書類審査', val: pendingReviewCount ?? 0, sub: '審査待ち', valColor: (pendingReviewCount ?? 0) > 0 ? 'text-blue-600' : 'text-gray-900', href: '/review' },
              { label: '未読メッセージ', val: unreadCount ?? 0, sub: 'チャット', valColor: 'text-gray-900', href: '/messages' },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-semibold ${s.valColor}`}>{s.val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </Link>
            ))}
          </section>

          {/* 2カラム */}
          <div className="grid grid-cols-2 gap-4">

            {/* 直近のイベント */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-800">直近のイベント</h2>
                <Link href="/events" className="text-xs text-gray-400 hover:text-gray-600">すべて見る →</Link>
              </div>

              {upcoming.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-400 text-sm mb-3">開催予定のイベントがありません</p>
                  <Link href="/events/new" className="text-xs bg-green-600 text-white px-4 py-2 rounded-lg inline-block">イベントを作成</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((ev: any) => {
                    const evApps = applications?.filter((a: any) => a.event_id === ev.id) ?? []
                    const evPending = evApps.filter((a: any) => a.status === 'pending')
                    const evApproved = evApps.filter((a: any) => a.status === 'approved')
                    const slots = ev.event_genre_slots ?? []
                    return (
                      <div key={ev.id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{ev.date} · 出店枠 {evApproved.length}/{ev.total_slots}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {evPending.length > 0 && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">応募 {evPending.length}件</span>
                            )}
                            <Link href={`/events/${ev.id}`} className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-700 transition-colors">確認</Link>
                          </div>
                        </div>
                        {slots.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                            {slots.map((slot: any) => {
                              const full = (slot.approved_count ?? 0) >= slot.max_count
                              return (
                                <span key={slot.id} className={`text-xs px-2 py-0.5 rounded-full border ${full ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                  {slot.genre} {slot.approved_count ?? 0}/{slot.max_count}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <Link href="/events/new"
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl py-2.5 hover:border-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新規イベントを作成
              </Link>
            </section>

            {/* 新着応募 */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-800">新着応募（要対応）</h2>
                {pending.length > 0 && (
                  <Link href="/events" className="text-xs text-gray-400 hover:text-gray-600">すべて見る（{pending.length}件）→</Link>
                )}
              </div>

              {pending.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-400 text-sm">新着応募はありません</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {pending.slice(0, 5).map((app: any) => {
                    const car = app.kitchen_cars
                    const ownerName = car?.profiles?.name ?? car?.name ?? 'オーナー'
                    const initChar = ownerName[0] ?? '？'
                    const evTitle = events?.find((e: any) => e.id === app.event_id)?.title ?? ''
                    return (
                      <div key={app.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0">{initChar}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{car?.name ?? ownerName}</p>
                          <p className="text-xs text-gray-400 truncate">{car?.genre ?? '—'} · {evTitle}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Link href={`/events/${app.event_id}`}
                            className="text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">見送る</Link>
                          <Link href={`/events/${app.event_id}`}
                            className="text-xs px-2.5 py-1 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">承認</Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>
    </div>
  )
}


async function VendorDashboard({ user, profile, supabase }: any) {
  const { data: myCars } = await supabase
    .from('kitchen_cars')
    .select('id, name, genre, verified_status, reject_reason')
    .eq('owner_id', user.id)

  const carIds = myCars?.map((c: any) => c.id) ?? []

  const { data: applications } = carIds.length > 0
    ? await supabase
        .from('applications')
        .select('id, status, applied_at, events(title, date, prefecture)')
        .in('kitchen_car_id', carIds)
        .order('applied_at', { ascending: false })
    : { data: [] }

  const pending  = applications?.filter((a: any) => a.status === 'pending')  ?? []
  const approved = applications?.filter((a: any) => a.status === 'approved') ?? []

  // 今月の売上
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { data: salesRecords } = await supabase
    .from('sales_records')
    .select('sales_amount, event_date')
    .eq('owner_id', user.id)
    .gte('event_date', `${monthStr}-01`)
  const salesThisMonth = (salesRecords ?? []).reduce((s: number, r: any) => s + (r.sales_amount ?? 0), 0)
  const formatYen = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万円` : `¥${n.toLocaleString()}`

  const { count: unreadCount } = applications?.length > 0
    ? await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .in('application_id', applications.map((a: any) => a.id))
    : { count: 0 }

  const today = new Date().toISOString().split('T')[0]
  const nextEvents = approved
    .filter((a: any) => a.events?.date >= today)
    .sort((a: any, b: any) => a.events?.date?.localeCompare(b.events?.date))
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-green-400">FestMatch</h1>
          <p className="text-xs text-slate-400">キッチンカーオーナー</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dev" className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded px-2 py-0.5">Dev</Link>
          <span className="text-sm text-slate-300">{profile?.name ?? user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-xs text-slate-500 hover:text-slate-300">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* 審査ステータスバナー */}
        {myCars && myCars.length > 0 && (() => {
          const car = myCars[0]
          if (car.verified_status === 'unsubmitted') return (
            <Link href="/kitchen-cars/documents" className="flex items-center gap-3 bg-blue-950/40 border border-blue-800 rounded-xl px-4 py-3 hover:opacity-80 transition-opacity">
              <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-300">書類審査が未提出です</p>
                <p className="text-xs text-blue-400/70">営業許可証・食品衛生責任者証を提出して審査を申請してください</p>
              </div>
              <svg className="w-4 h-4 text-blue-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
          if (car.verified_status === 'pending') return (
            <div className="flex items-center gap-3 bg-yellow-950/40 border border-yellow-800 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-yellow-400 shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-300">書類審査中</p>
                <p className="text-xs text-yellow-400/70">承認まで数日かかる場合があります</p>
              </div>
            </div>
          )
          if (car.verified_status === 'rejected') return (
            <Link href="/kitchen-cars/documents" className="flex items-center gap-3 bg-red-950/40 border border-red-800 rounded-xl px-4 py-3 hover:opacity-80 transition-opacity">
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-300">書類が差し戻されました</p>
                <p className="text-xs text-red-400/70">{car.reject_reason ?? '内容を確認して再提出してください'}</p>
              </div>
              <svg className="w-4 h-4 text-red-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
          return null
        })()}

        {/* サマリー */}
        <section className="grid grid-cols-2 gap-3">
          {[
            { label: '審査中', val: `${pending.length}件`, color: 'text-yellow-400', bg: 'bg-yellow-950/40', href: '/my-applications' },
            { label: '承認済み', val: `${approved.length}件`, color: 'text-green-400', bg: 'bg-green-950/40', href: '/my-applications' },
          ].map(stat => (
            <Link key={stat.label} href={stat.href}
              className={`${stat.bg} rounded-2xl p-4 text-center hover:opacity-80 transition-opacity`}>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.val}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </Link>
          ))}
        </section>

        {/* 今月の売上 */}
        <Link href="/my-sales" className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center justify-between hover:border-green-300 transition-colors">
          <div>
            <p className="text-xs text-slate-400">今月の売上（入力済み）</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{salesThisMonth > 0 ? formatYen(salesThisMonth) : '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{(salesRecords ?? []).length}イベント計</p>
          </div>
          <div className="text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </Link>

        {/* キッチンカー未登録 */}
        {(!myCars || myCars.length === 0) && (
          <Link href="/kitchen-cars/new"
            className="flex items-center gap-3 bg-green-950/40 border border-green-200 rounded-2xl px-4 py-3">
            <span className="text-xl">🚚</span>
            <div>
              <p className="text-sm font-medium text-green-400">キッチンカーを登録しましょう</p>
              <p className="text-xs text-green-400">登録するとイベントに応募できます</p>
            </div>
            <span className="ml-auto text-green-400 text-lg">›</span>
          </Link>
        )}

        {/* クイックアクション */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">クイックアクション</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/browse"
              className="bg-green-600 text-white rounded-2xl p-4 flex items-center gap-3 hover:bg-green-700 transition-colors">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div>
                <p className="font-semibold text-sm">イベントを探す</p>
                <p className="text-xs text-green-100">出店できるフェスを検索</p>
              </div>
            </Link>
            <Link href="/my-applications"
              className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:border-green-300 transition-colors">
              <svg className="w-6 h-6 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div>
                <p className="font-semibold text-sm text-slate-100">応募状況</p>
                <p className="text-xs text-slate-400">全 {(applications ?? []).length}件</p>
              </div>
            </Link>
            <Link href="/messages"
              className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:border-green-300 transition-colors">
              <svg className="w-6 h-6 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <div>
                <p className="font-semibold text-sm text-slate-100">チャット</p>
                <p className="text-xs text-slate-400">主催者と連絡</p>
              </div>
            </Link>
            <Link href="/kitchen-cars/new"
              className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:border-green-300 transition-colors">
              <svg className="w-6 h-6 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              <div>
                <p className="font-semibold text-sm text-slate-100">車両登録</p>
                <p className="text-xs text-slate-400">{myCars?.length ?? 0}台登録済み</p>
              </div>
            </Link>
          </div>
        </section>

        {/* 承認済み・次の出店 */}
        {nextEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">承認済み・次の出店</h2>
            <div className="space-y-2">
              {nextEvents.map((app: any) => (
                <Link key={app.id} href={`/messages/${app.id}`}
                  className="bg-slate-800 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-green-400 transition-colors">
                  <div className="w-2 h-2 bg-green-950/400 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 text-sm truncate">{app.events?.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">📅 {app.events?.date} · {app.events?.prefecture}</p>
                  </div>
                  <span className="text-xs text-green-400 font-medium shrink-0">メッセージ →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 審査中 */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">審査中の応募</h2>
            <div className="space-y-2">
              {pending.slice(0, 3).map((app: any) => (
                <div key={app.id}
                  className="bg-slate-800 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 text-sm truncate">{app.events?.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">📅 {app.events?.date}</p>
                  </div>
                  <span className="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-0.5 rounded-full shrink-0">審査中</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <VendorBottomNav />
    </div>
  )
}
