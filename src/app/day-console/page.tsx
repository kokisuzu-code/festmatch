import { isEventEnded } from '@/lib/events'
import DayConsole from './DayConsole'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: '当日運営コンソール', description: '会場状況、ベンダー、連絡、運営チェックを管理します。' }

export default async function DayConsolePage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { supabase, user, profile } = await requireRole('organizer')
  const { event: requestedEvent } = await searchParams
  const { data: organizer, error: organizerError } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  if (organizerError) throw new Error('主催者情報を読み込めませんでした。')
  const { data: rows, error } = organizer ? await supabase.from('events').select('id,title,starts_at,ends_at,address,prefecture,slug').eq('organizer_id', organizer.id).order('starts_at', { ascending: false }) : { data: [], error: null }
  if (error) throw new Error('イベントを読み込めませんでした。')
  const events = (rows ?? []).map(row => ({ id: row.id, title: row.title, startsAt: row.starts_at, endsAt: row.ends_at, address: [row.prefecture, row.address].filter(Boolean).join(' '), slug: row.slug }))
  const next = [...events].filter(event => !isEventEnded({ ends_at: event.endsAt })).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const initialEventId = events.some(event => event.id === requestedEvent) ? requestedEvent : next?.id ?? events[0]?.id
  return <DayConsole events={events} initialEventId={initialEventId} operatorName={profile?.display_name ?? '運営担当者'} />
}
