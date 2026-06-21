import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import OrganizerSidebarNav from '@/components/OrganizerSidebarNav'
import ApplicationActions from './ApplicationActions'
import AppCard from './AppCard'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  const nameChar = (profile?.name ?? user.email ?? '?')[0].toUpperCase()

  const { data: event } = await supabase
    .from('events')
    .select('*, event_genre_slots(*)')
    .eq('id', id)
    .eq('organizer_id', user.id)
    .single()

  if (!event) notFound()

  const { data: applications } = await supabase
    .from('applications')
    .select('*, kitchen_cars(name, genre, car_length_m, needs_power, photo_url, verified_status, description, profiles(name, avatar_url))')
    .eq('event_id', id)
    .order('applied_at', { ascending: true })

  const pending  = applications?.filter(a => a.status === 'pending')  ?? []
  const approved = applications?.filter(a => a.status === 'approved') ?? []
  const others   = applications?.filter(a => !['pending','approved'].includes(a.status)) ?? []

  // ジャンル枠の充足状況
  const slots = event.event_genre_slots ?? []
  const genreApprovedCount: Record<string, number> = {}
  approved.forEach((a: any) => {
    const g = a.genre ?? a.kitchen_cars?.genre ?? ''
    if (g) genreApprovedCount[g] = (genreApprovedCount[g] ?? 0) + 1
  })

  const ds: string[] = event.dates?.length ? [...event.dates].sort() : event.date ? [event.date] : []
  const dateStr = ds.length === 0 ? '日程未定'
    : ds.length === 1 ? ds[0]
    : `${ds[0]} 〜 ${ds[ds.length - 1]}（${ds.length}日間）`

  return (
    <div className="light-theme flex h-screen overflow-hidden bg-gray-50">
      <OrganizerSidebarNav nameChar={nameChar} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* トップバー */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/events" className="text-xs text-gray-400 hover:text-gray-600">イベント一覧</Link>
              <span className="text-gray-300 text-xs">/</span>
              <span className="text-xs text-gray-700 font-medium">{event.title}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {dateStr} · {event.prefecture} · 出店枠 {event.total_slots} · 応募 {applications?.length ?? 0}件
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">承認済み {approved.length} / {event.total_slots}</span>
            <Link href={`/events/${id}/edit`} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
              編集
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-5 space-y-4">

          {/* ジャンル枠充足状況 */}
          {slots.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">ジャンル枠の充足状況</p>
              <div className="grid grid-cols-4 gap-3">
                {slots.map((slot: any) => {
                  const approvedN = genreApprovedCount[slot.genre] ?? 0
                  const pct = slot.max_count > 0 ? Math.min(100, (approvedN / slot.max_count) * 100) : 0
                  const full = approvedN >= slot.max_count
                  const barColor = full ? 'bg-red-400' : pct > 0 ? 'bg-amber-400' : 'bg-green-400'
                  return (
                    <div key={slot.id} className="border border-gray-100 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-medium text-gray-800 mb-1.5">{slot.genre}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className={`text-xs ${full ? 'text-red-500' : approvedN === 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {approvedN} / {slot.max_count}
                        {full && <span className="ml-1">定員満了</span>}
                        {!full && approvedN === 0 && <span className="ml-1">募集中</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* 未対応の応募 */}
          {pending.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-500 mb-2">未対応の応募（{pending.length}件）</p>

              {/* 定員満了ジャンルの警告 */}
              {(() => {
                const fullGenres = slots
                  .filter((s: any) => (genreApprovedCount[s.genre] ?? 0) >= s.max_count)
                  .map((s: any) => s.genre)
                const affected = pending.filter((a: any) => fullGenres.includes(a.genre ?? a.kitchen_cars?.genre))
                if (!affected.length || !fullGenres.length) return null
                return (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    「{fullGenres.join('・')}」は定員満了です。同ジャンルの応募は承認できません。
                  </div>
                )
              })()}

              <div className="space-y-2">
                {pending.map((app: any) => (
                  <AppCard key={app.id} app={app} eventId={id} slots={slots} genreApprovedCount={genreApprovedCount} />
                ))}
              </div>
            </section>
          )}

          {/* 承認済み */}
          {approved.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-500 mb-2">承認済み（{approved.length}件）</p>
              <div className="space-y-2">
                {approved.map((app: any) => (
                  <AppCard key={app.id} app={app} eventId={id} slots={slots} genreApprovedCount={genreApprovedCount} readonly />
                ))}
              </div>
            </section>
          )}

          {/* その他（見送り等） */}
          {others.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-500 mb-2">見送り・その他（{others.length}件）</p>
              <div className="space-y-2">
                {others.map((app: any) => (
                  <AppCard key={app.id} app={app} eventId={id} slots={slots} genreApprovedCount={genreApprovedCount} readonly />
                ))}
              </div>
            </section>
          )}

          {applications?.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <p className="text-gray-400 text-sm">まだ応募がありません</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

