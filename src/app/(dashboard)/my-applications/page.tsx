import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VendorBottomNav from '@/components/VendorBottomNav'

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending:  { label: '審査中',   color: 'bg-yellow-900/30 text-yellow-300', icon: '⏳' },
  approved: { label: '承認済み', color: 'bg-green-900/30 text-green-400',  icon: '✅' },
  declined: { label: '見送り',   color: 'bg-red-900/30 text-red-400',     icon: '❌' },
  cancelled:{ label: 'キャンセル', color: 'bg-slate-700 text-slate-400', icon: '🚫' },
  waitlist: { label: '補欠',     color: 'bg-blue-900/30 text-blue-400',   icon: '📋' },
}

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myCars } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_id', user.id)

  const carIds = myCars?.map(c => c.id) ?? []

  const { data: applications } = carIds.length > 0
    ? await supabase
        .from('applications')
        .select('*, events(title, date, location, prefecture), vendors(name)')
        .in('vendor_id', carIds)
        .order('applied_at', { ascending: false })
    : { data: [] }

  const pending  = applications?.filter(a => a.status === 'pending')  ?? []
  const approved = applications?.filter(a => a.status === 'approved') ?? []
  const others   = applications?.filter(a => !['pending','approved'].includes(a.status)) ?? []

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-slate-100">応募状況</h1>
        <p className="text-xs text-slate-400 mt-0.5">申し込んだイベントの一覧</p>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {(!applications || applications.length === 0) ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-slate-400 mb-6">まだ応募していません</p>
            <Link
              href="/browse"
              className="bg-green-600 text-white font-semibold px-6 py-3 rounded-2xl inline-block"
            >
              イベントを探す
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">審査中 ({pending.length}件)</h2>
                <div className="space-y-3">
                  {pending.map(app => <AppCard key={app.id} app={app} />)}
                </div>
              </section>
            )}
            {approved.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">承認済み ({approved.length}件)</h2>
                <div className="space-y-3">
                  {approved.map(app => <AppCard key={app.id} app={app} />)}
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-slate-400 mb-2 px-1">その他</h2>
                <div className="space-y-3">
                  {others.map(app => <AppCard key={app.id} app={app} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <VendorBottomNav />
    </div>
  )
}

function AppCard({ app }: { app: any }) {
  const s = statusConfig[app.status] ?? statusConfig.pending
  const event = app.events
  const car = app.vendors

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-100 leading-snug">{event?.title}</h3>
          <p className="text-sm text-slate-400 mt-1">📅 {event?.date}</p>
          <p className="text-sm text-slate-400">📍 {event?.prefecture} · {event?.location}</p>
          <p className="text-xs text-slate-500 mt-2">{car?.name} · {app.genre}</p>
          {app.decline_reason && (
            <p className="text-xs text-red-400 mt-1">理由: {app.decline_reason}</p>
          )}
        </div>
        <span className={`text-sm font-medium px-3 py-1.5 rounded-xl shrink-0 ${s.color}`}>
          {s.icon} {s.label}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700">
        <Link href={`/messages/${app.id}`} className="text-sm text-green-400 font-medium">
          💬 主催者にメッセージ →
        </Link>
      </div>
    </div>
  )
}
