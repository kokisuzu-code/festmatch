import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ChatWindow from './ChatWindow'

export default async function ChatPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 応募情報（主催者 or オーナーのみアクセス可）
  const { data: application } = await supabase
    .from('applications')
    .select(`
      *,
      events(id, title, date, organizer_id),
      vendors(id, name, owner_id, profiles(name))
    `)
    .eq('id', applicationId)
    .single()

  if (!application) notFound()

  const isOrganizer = application.events?.organizer_id === user.id
  const isOwner = application.vendors?.owner_id === user.id
  if (!isOrganizer && !isOwner) notFound()

  // 既存メッセージ取得
  const { data: initialMessages } = await supabase
    .from('messages')
    .select('*, profiles(name)')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true })

  const partnerName = isOrganizer
    ? (application.vendors?.profiles as any)?.name ?? 'キッチンカーオーナー'
    : '主催者'

  const backHref = isOrganizer
    ? `/events/${application.events?.id}`
    : '/my-applications'

  if (isOrganizer) {
    return (
      <div className="light-theme flex h-screen overflow-hidden bg-gray-50">
        {/* 主催者用サイドバー */}
        <div className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
          <div className="px-5 py-4 border-b border-gray-100">
            <span className="text-base font-bold text-gray-900 tracking-tight">FestMatch</span>
            <span className="ml-2 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">主催者</span>
          </div>
          <div className="flex-1 px-3 py-3">
            <Link href="/messages" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              チャット一覧に戻る
            </Link>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
            <p className="text-sm font-semibold text-gray-900">{partnerName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{application.events?.title} · {application.vendors?.name}</p>
          </header>
          <ChatWindow
            applicationId={applicationId}
            userId={user.id}
            initialMessages={initialMessages ?? []}
            isOrganizer={isOrganizer}
            applicationStatus={application.status}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href={backHref} className="text-slate-400 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="font-semibold text-slate-100 text-sm">{partnerName}</p>
          <p className="text-xs text-slate-400 truncate max-w-[240px]">
            {application.events?.title} · {application.vendors?.name}
          </p>
        </div>
      </header>

      {/* チャットウィンドウ（リアルタイム） */}
      <ChatWindow
        applicationId={applicationId}
        userId={user.id}
        initialMessages={initialMessages ?? []}
        isOrganizer={isOrganizer}
        applicationStatus={application.status}
      />
    </div>
  )
}
