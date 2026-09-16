import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import ChatPanel from '@/components/chat/ChatPanel'

export const dynamic = 'force-dynamic'

export default async function VendorChatThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const { supabase, user } = await requireRole('vendor')
  const { data: thread } = await supabase.from('chat_threads').select('id, event_id, type, vendor_id').eq('id', threadId).maybeSingle()
  if (!thread) notFound()
  const [{ data: event }, { data: messages }] = await Promise.all([
    supabase.from('events').select('title, starts_at').eq('id', thread.event_id).maybeSingle(),
    supabase.from('chat_messages').select('id, sender_id, body, created_at').eq('thread_id', thread.id).order('created_at'),
  ])
  const isBroadcast = thread.type === 'broadcast'
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">{isBroadcast ? 'NOTICE' : 'DIRECT CHAT'}</p><h1>{isBroadcast ? 'イベントのお知らせ' : '主催者との個別チャット'}</h1><p>{event?.title ?? 'イベント'}{isBroadcast ? ' ・ お知らせは閲覧のみです。' : ''}</p></div><Link className="button button-secondary" href="/vendor/messages">一覧へ戻る</Link></section><ChatPanel threadId={thread.id} messages={(messages ?? []).map((message) => ({ ...message, isMine: message.sender_id === user.id }))} canPost={!isBroadcast} /></div>
}
