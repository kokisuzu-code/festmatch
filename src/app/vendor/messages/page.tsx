import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { formatEventDate } from '@/lib/events'
import { OpenDirectChatButton } from '@/components/chat/OpenChatButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'チャット', description: '主催者との個別チャットとイベントのお知らせを確認できます。' }

export default async function VendorMessagesPage() {
  const { supabase, user } = await requireRole('vendor')
  const { data: vendor } = await supabase.from('vendors').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: applications } = vendor
    ? await supabase
      .from('applications')
      .select('id, event_id, status, events(title, starts_at, prefecture)')
      .eq('vendor_id', vendor.id)
      .in('status', ['approved', 'paid'])
      .order('updated_at', { ascending: false })
    : { data: [] }
  const eventIds = (applications ?? []).map((application) => application.event_id)
  const { data: threads } = eventIds.length
    ? await supabase.from('chat_threads').select('id, event_id, type, vendor_id, updated_at').in('event_id', eventIds).order('updated_at', { ascending: false })
    : { data: [] }
  const directByEventId = new Map((threads ?? []).filter((thread) => thread.type === 'direct' && thread.vendor_id === vendor?.id).map((thread) => [thread.event_id, thread]))
  const broadcastByEventId = new Map((threads ?? []).filter((thread) => thread.type === 'broadcast').map((thread) => [thread.event_id, thread]))

  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">CHAT</p><h1>チャット・お知らせ</h1><p>承認済みイベントについて、主催者への連絡とお知らせの確認ができます。</p></div></section><section className="panel">{applications?.length && vendor ? <div className="event-list">{applications.map((application) => { const event = application.events as { title?: string; starts_at?: string; prefecture?: string } | null; const direct = directByEventId.get(application.event_id); const broadcast = broadcastByEventId.get(application.event_id); return <div className="vendor-message-event" key={application.id}><div><strong>{event?.title ?? 'イベント'}</strong><span>{event?.starts_at ? formatEventDate(event.starts_at) : ''}{event?.prefecture ? ` ・ ${event.prefecture}` : ''}</span></div><div className="vendor-message-actions">{direct ? <Link className="button button-secondary" href={`/vendor/messages/${direct.id}`}>主催者とのチャット</Link> : <OpenDirectChatButton eventId={application.event_id} vendorId={vendor.id} href="/vendor/messages" />}{broadcast && <Link className="text-link" href={`/vendor/messages/${broadcast.id}`}>お知らせを読む</Link>}</div></div> })}</div> : <div className="empty-state"><h2>確認できるチャットはありません</h2><p>イベントへの応募が承認されると、主催者との個別チャットを開始できます。</p><Link className="button button-primary" href="/vendor/events">イベントを探す</Link></div>}</section></div>
}
