import Link from 'next/link'
import { completeGenreSlots } from '@/lib/genres'
import GenreCapacityManager from '@/components/organizer/GenreCapacityManager'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'ジャンル枠管理', description: 'イベントのジャンル別出店枠を管理します。' }

export default async function OrganizerGenresPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: requestedEventId } = await searchParams
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: events } = organizer
    ? await supabase.from('events').select('id, title, capacity').eq('organizer_id', organizer.id).order('starts_at', { ascending: false })
    : { data: [] }
  const selectedEvent = (events ?? []).find((event) => event.id === requestedEventId) ?? events?.[0]

  if (!selectedEvent) {
    return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">GENRE CAPACITY</p><h1>ジャンル枠管理</h1><p>料理カテゴリごとの上限を決め、出店内容の偏りを防ぎます。</p></div><Link className="button button-primary" href="/organizer/events/new">＋ イベントを作成</Link></section><section className="panel empty-state"><h2>管理できるイベントがありません</h2><p>イベントを作成するとジャンル枠を設定できます。</p></section></div>
  }

  const [{ data: slots }, { data: spaces }, { data: applications }] = await Promise.all([
    supabase.from('event_genre_slots').select('id, genre, capacity').eq('event_id', selectedEvent.id).order('genre'),
    supabase.from('event_spaces').select('id, label, genre').eq('event_id', selectedEvent.id).order('label'),
    supabase.from('applications').select('status, vendor_genre_snapshot').eq('event_id', selectedEvent.id),
  ])
  const initialSlots = completeGenreSlots(slots ?? [])
  const approvedByGenre: Record<string, number> = {}
  const applicationsByGenre: Record<string, number> = {}
  for (const application of applications ?? []) {
    const genre = application.vendor_genre_snapshot || 'その他'
    applicationsByGenre[genre] = (applicationsByGenre[genre] ?? 0) + 1
    if (application.status === 'approved' || application.status === 'paid') approvedByGenre[genre] = (approvedByGenre[genre] ?? 0) + 1
  }

  return (
    <div className="dashboard-stack">
      <section className="dashboard-hero genre-page-hero">
        <div><p className="eyebrow">GENRE CAPACITY</p><h1>ジャンル枠管理</h1><p>料理カテゴリごとの上限を決め、出店内容の偏りを防ぎます。</p></div>
        <Link className="button button-primary" href={`/organizer/events/${selectedEvent.id}/edit#booth-bidding`}>区画・募集設定</Link>
      </section>
      <div className="genre-event-select">
        <div><span>対象イベント</span><strong>{selectedEvent.title}</strong></div>
        <form><select aria-label="対象イベント" defaultValue={selectedEvent.id} name="event">{(events ?? []).map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select><button type="submit">イベントを変更⌄</button></form>
      </div>
      <GenreCapacityManager eventId={selectedEvent.id} initialSlots={initialSlots} spaces={spaces ?? []} approvedByGenre={approvedByGenre} applicationsByGenre={applicationsByGenre} />
    </div>
  )
}
