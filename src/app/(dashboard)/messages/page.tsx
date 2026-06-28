export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OrganizerSidebarNav from '@/components/OrganizerSidebarNav'
import VendorBottomNav from '@/components/VendorBottomNav'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOrganizer = profile?.role === 'organizer'

  // 自分が関係する応募を取得
  let applications: any[] = []

  if (isOrganizer) {
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('organizer_id', user.id)

    const eventIds = events?.map(e => e.id) ?? []

    if (eventIds.length > 0) {
      const { data } = await supabase
        .from('applications')
        .select('id, status, events(title, date), vendors(name, profiles(name))')
        .in('event_id', eventIds)
        .order('applied_at', { ascending: false })
      applications = data ?? []
    }
  } else {
    const { data: myCars } = await supabase
      .from('vendors')
      .select('id')
      .eq('owner_id', user.id)

    const carIds = myCars?.map(c => c.id) ?? []

    if (carIds.length > 0) {
      const { data } = await supabase
        .from('applications')
        .select('id, status, events(title, date, organizer_id, profiles(name)), vendors(name)')
        .in('vendor_id', carIds)
        .order('applied_at', { ascending: false })
      applications = data ?? []
    }
  }

  // 各応募の最新メッセージを取得
  const appIds = applications.map(a => a.id)
  let lastMessageMap: Record<string, any> = {}

  if (appIds.length > 0) {
    const { data: allMessages } = await supabase
      .from('messages')
      .select('application_id, body, media_type, created_at, sender_id')
      .in('application_id', appIds)
      .order('created_at', { ascending: false })

    for (const msg of allMessages ?? []) {
      if (!lastMessageMap[msg.application_id]) {
        lastMessageMap[msg.application_id] = msg
      }
    }
  }

  // 最新メッセージ順にソート（メッセージがあるものを上に）
  const sorted = [...applications].sort((a, b) => {
    const ta = lastMessageMap[a.id]?.created_at ?? '0'
    const tb = lastMessageMap[b.id]?.created_at ?? '0'
    return tb.localeCompare(ta)
  })

  const statusLabel: Record<string, string> = {
    pending: '審査中', approved: '承認済み', declined: '見送り',
    cancelled: 'キャンセル', waitlist: '補欠',
  }

  const formatTime = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return '昨日'
    if (diffDays < 7) return date.toLocaleDateString('ja-JP', { weekday: 'short' })
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  // ── 主催者ビュー（サイドバー＋ホワイトテーマ） ──────────────────────────────
  if (isOrganizer) {
    // 承認済みの応募のみチャット表示
    const approvedSorted = sorted.filter((a: any) => a.status === 'approved')

    return (
      <div className="light-theme flex h-screen overflow-hidden bg-gray-50">
        <OrganizerSidebarNav nameChar="主" unreadCount={0} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
            <h1 className="text-sm font-semibold text-gray-700">チャット</h1>
            <p className="text-xs text-gray-400 mt-0.5">承認済み出店者との会話</p>
          </header>

          <main className="flex-1 overflow-auto">
            {approvedSorted.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-sm">承認済みの出店者との会話がありません</p>
              </div>
            ) : (
              <div className="bg-white divide-y divide-gray-100">
                {approvedSorted.map((app: any) => {
                  const lastMsg = lastMessageMap[app.id]
                  const event = app.events
                  const car = app.vendors
                  const partnerName = (car?.profiles as any)?.name ?? car?.name ?? 'キッチンカーオーナー'
                  const subtitle = `${event?.title ?? ''}`
                  let preview = 'メッセージはまだありません'
                  if (lastMsg) {
                    if (lastMsg.media_type === 'image') preview = '画像'
                    else if (lastMsg.media_type === 'video') preview = '動画'
                    else preview = lastMsg.body
                  }
                  const isMineLastMsg = lastMsg?.sender_id === user.id
                  const initial = partnerName.charAt(0)

                  return (
                    <Link
                      key={app.id}
                      href={`/messages/${app.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-medium text-blue-700">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{partnerName}</p>
                          {lastMsg && (
                            <span className="text-xs text-gray-400 shrink-0">{formatTime(lastMsg.created_at)}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {isMineLastMsg && lastMsg ? `自分: ${preview}` : preview}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    )
  }

  // ── 出店者ビュー（ダークテーマ） ───────────────────────────────
  const statusColor: Record<string, string> = {
    pending:   'bg-yellow-900/30 text-yellow-300',
    approved:  'bg-green-900/30 text-green-400',
    declined:  'bg-red-900/30 text-red-400',
    cancelled: 'bg-slate-700 text-slate-400',
    waitlist:  'bg-blue-900/30 text-blue-400',
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-slate-100">チャット</h1>
        <p className="text-xs text-slate-400 mt-0.5">すべての会話</p>
      </header>

      <main className="max-w-lg mx-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-slate-400 text-sm">まだ会話がありません</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {sorted.map(app => {
              const lastMsg = lastMessageMap[app.id]
              const event = app.events
              const car = app.vendors
              const partnerName = '主催者'
              const subtitle = event?.title ?? ''
              let preview = 'メッセージはまだありません'
              if (lastMsg) {
                if (lastMsg.media_type === 'image') preview = '📷 画像'
                else if (lastMsg.media_type === 'video') preview = '🎬 動画'
                else preview = lastMsg.body
              }
              const isMineLastMsg = lastMsg?.sender_id === user.id

              return (
                <Link
                  key={app.id}
                  href={`/messages/${app.id}`}
                  className="flex items-center gap-3 px-4 py-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                    <span className="text-xl">🎪</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-100 text-sm truncate">{partnerName}</p>
                      {lastMsg && (
                        <span className="text-xs text-slate-500 shrink-0">{formatTime(lastMsg.created_at)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
                    <p className={`text-sm truncate mt-1 ${lastMsg ? 'text-slate-300' : 'text-slate-500'}`}>
                      {isMineLastMsg && lastMsg ? `自分: ${preview}` : preview}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColor[app.status] ?? 'bg-slate-700 text-slate-400'}`}>
                    {statusLabel[app.status] ?? app.status}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <VendorBottomNav />
    </div>
  )
}
