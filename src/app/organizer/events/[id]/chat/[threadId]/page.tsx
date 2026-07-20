import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import ChatPanel from '@/components/chat/ChatPanel'

export const dynamic = 'force-dynamic'

export default async function OrganizerChatThreadPage({ params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: event } = organizer
    ? await supabase.from('events').select('id, title').eq('id', id).eq('organizer_id', organizer.id).maybeSingle()
    : { data: null }
  if (!event) notFound()
  const { data: thread } = await supabase.from('chat_threads').select('id, type, vendor_id').eq('id', threadId).eq('event_id', id).maybeSingle()
  if (!thread) notFound()
  const [{ data: messages }, { data: vendor }] = await Promise.all([
    supabase.from('chat_messages').select('id, sender_id, body, created_at').eq('thread_id', thread.id).order('created_at'),
    thread.vendor_id ? supabase.from('vendors_public').select('name, genre').eq('id', thread.vendor_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const title = thread.type === 'broadcast' ? '参加者全員へのお知らせ' : `${vendor?.name ?? 'ベンダー'}との個別チャット`
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">{thread.type === 'broadcast' ? 'BROADCAST' : 'DIRECT CHAT'}</p><h1>{title}</h1><p>{event.title}{thread.type === 'broadcast' ? ' ・ 承認済みベンダー全員へ配信' : ` ・ ${vendor?.genre ?? 'ジャンル未設定'}`}</p></div><Link className="button button-secondary" href={`/organizer/events/${id}/chat`}>一覧へ戻る</Link></section><ChatPanel threadId={thread.id} messages={(messages ?? []).map((message) => ({ ...message, isMine: message.sender_id === user.id }))} canPost /></div>
}
