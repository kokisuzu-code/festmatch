import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { OpenBroadcastChatButton, OpenDirectChatButton } from '@/components/chat/OpenChatButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'イベントチャット', description: '承認済みベンダーとの連絡と参加者全員へのお知らせを管理します。' }

export default async function OrganizerEventChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: event } = organizer
    ? await supabase.from('events').select('id, title').eq('id', id).eq('organizer_id', organizer.id).maybeSingle()
    : { data: null }
  if (!event) notFound()

  const { data: applications } = await supabase
    .from('applications')
    .select('id, vendor_id, status')
    .eq('event_id', id)
    .in('status', ['approved', 'paid'])
    .order('updated_at', { ascending: false })
  const vendorIds = (applications ?? []).map((application) => application.vendor_id)
  const [{ data: vendors }, { data: threads }] = await Promise.all([
    vendorIds.length ? supabase.from('vendors_public').select('id, name, genre').in('id', vendorIds) : Promise.resolve({ data: [] }),
    supabase.from('chat_threads').select('id, type, vendor_id, updated_at').eq('event_id', id),
  ])
  const vendorById = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor]))
  const directThreadByVendorId = new Map((threads ?? []).filter((thread) => thread.type === 'direct' && thread.vendor_id).map((thread) => [thread.vendor_id!, thread]))
  const broadcastThread = (threads ?? []).find((thread) => thread.type === 'broadcast')

  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">EVENT CHAT</p><h1>{event.title}</h1><p>承認済みベンダーとの個別連絡と、参加者全員へのお知らせを管理します。</p></div><Link className="button button-secondary" href={`/organizer/events/${id}`}>イベントへ戻る</Link></section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">BROADCAST</p><h2>参加者全員へお知らせ</h2></div></div><p className="panel-copy">承認済みのベンダー全員へ一方向で配信されます。ベンダーは閲覧のみで返信できません。</p>{broadcastThread ? <Link className="button button-primary" href={`/organizer/events/${id}/chat/${broadcastThread.id}`}>お知らせを開く</Link> : <OpenBroadcastChatButton eventId={id} href={`/organizer/events/${id}/chat`} />}</section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">DIRECT</p><h2>個別チャット</h2></div></div>{applications?.length ? <div className="event-list">{applications.map((application) => { const vendor = vendorById.get(application.vendor_id); const thread = directThreadByVendorId.get(application.vendor_id); return <div className="event-row" key={application.id}><div><strong>{vendor?.name ?? 'ベンダー'}</strong><span>{vendor?.genre ?? 'ジャンル未設定'} ・ {application.status === 'paid' ? '決済済み' : '承認済み'}</span></div>{thread ? <Link className="button button-secondary" href={`/organizer/events/${id}/chat/${thread.id}`}>チャットを開く</Link> : <OpenDirectChatButton eventId={id} vendorId={application.vendor_id} href={`/organizer/events/${id}/chat`} />}</div> })}</div> : <div className="empty-state"><h2>承認済みのベンダーはいません</h2><p>応募を承認すると個別チャットを開始できます。</p></div>}</section>
  </div>
}
