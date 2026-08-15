import Link from 'next/link'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'メッセージ', description: 'イベントごとの出店者メッセージを確認します。' }

export default async function OrganizerMessagesPage() {
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: events } = organizer ? await supabase.from('events').select('id, title, starts_at').eq('organizer_id', organizer.id).order('starts_at', { ascending: false }) : { data: [] }
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">MESSAGES</p><h1>メッセージ</h1><p>イベントごとの連絡を一つの場所から確認できます。</p></div></section><section className="panel"><div className="section-heading"><div><p className="eyebrow">EVENT THREADS</p><h2>イベント別メッセージ</h2></div></div>{events?.length ? <div className="event-list">{events.map((event) => <Link className="event-row" href={`/organizer/events/${event.id}/chat`} key={event.id}><div><strong>{event.title}</strong><span>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(event.starts_at))}</span></div><span>チャットを開く →</span></Link>)}</div> : <div className="empty-state"><h2>メッセージはありません</h2><p>イベント作成後、出店者とのチャットがここに表示されます。</p></div>}</section></div>
}
