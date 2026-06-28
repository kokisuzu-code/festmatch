import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OrganizerSidebarNav from '@/components/OrganizerSidebarNav'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, { label: string; color: string }> = {
  draft:     { label: '下書き',    color: 'bg-gray-100 text-gray-500' },
  published: { label: '公開中',   color: 'bg-green-100 text-green-700' },
  closed:    { label: '締切',     color: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-500' },
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // profile と events を並列取得
  const [{ data: profile }, { data: events }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase
      .from('events')
      .select('*, event_genre_slots(*)')
      .eq('organizer_id', user.id)
      .order('date', { ascending: true }),
  ])

  const nameChar = (profile?.name ?? user.email ?? '?')[0].toUpperCase()
  const eventIds = events?.map(e => e.id) ?? []
  const { data: applications } = eventIds.length > 0
    ? await supabase
        .from('applications')
        .select('id, status, event_id')
        .in('event_id', eventIds)
    : { data: [] }

  return (
    <div className="light-theme flex h-screen overflow-hidden bg-gray-50">
      <OrganizerSidebarNav nameChar={nameChar} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-sm font-semibold text-gray-700">イベント一覧</h1>
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

        <main className="flex-1 overflow-auto px-6 py-5">
          {(!events || events.length === 0) ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <p className="text-gray-400 text-sm mb-4">まだイベントがありません</p>
              <Link href="/events/new" className="text-sm bg-green-600 text-white px-5 py-2 rounded-lg inline-block hover:bg-green-700 transition-colors">
                最初のイベントを作成
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">イベント名</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">日程</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">場所</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">出店枠</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">応募中</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">承認済</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">ステータス</th>
                    <th className="px-4 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.map((event, i) => {
                    const s = statusLabel[event.status] ?? statusLabel.draft
                    const evApps = applications?.filter((a: any) => a.event_id === event.id) ?? []
                    const pendingCount = evApps.filter((a: any) => a.status === 'pending').length
                    const approvedCount = evApps.filter((a: any) => a.status === 'approved').length

                    const ds: string[] = event.dates?.length ? [...event.dates].sort() : event.date ? [event.date] : []
                    const dateStr = ds.length === 0 ? '日程未定'
                      : ds.length === 1 ? ds[0]
                      : `${ds[0]} 〜 ${ds[ds.length - 1]}`

                    return (
                      <tr key={event.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{event.title}</p>
                          {event.fee > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">出店料 ¥{event.fee.toLocaleString()}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{dateStr}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{event.prefecture}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">{event.total_slots}</td>
                        <td className="px-4 py-3 text-center">
                          {pendingCount > 0 ? (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pendingCount}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">{approvedCount}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/events/${event.id}`}
                            className="text-xs text-gray-400 hover:text-gray-700 group-hover:text-gray-700 transition-colors font-medium"
                          >
                            管理 →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
