import DayConsole, { type DayConsoleEvent } from './DayConsole'
import { requireRole } from '@/lib/auth'
import { acceptedApplicationStatuses } from '@/lib/slots'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: '当日運営コンソール',
  description: 'FestMatchの会場状況、出店者、連絡、運営チェックを一画面で管理します。',
}

type EventRow = {
  id: string
  title: string
  starts_at: string
  ends_at: string
  address: string | null
  prefecture: string | null
  slug: string | null
  capacity: number | null
}

export default async function DayConsolePage() {
  const { supabase, user, profile } = await requireRole('organizer')
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()

  if (!organizer) {
    return <DayConsole events={[]} operatorName={profile?.display_name ?? '運営担当者'} />
  }

  const { data: eventRows } = await supabase
    .from('events')
    .select('id, title, starts_at, ends_at, address, prefecture, slug, capacity')
    .eq('organizer_id', organizer.id)
    .order('starts_at', { ascending: false })
    .limit(20)

  const events = (eventRows ?? []) as EventRow[]
  const eventIds = events.map((event) => event.id)

  if (!eventIds.length) {
    return <DayConsole events={[]} operatorName={profile?.display_name ?? '運営担当者'} />
  }

  const [{ data: spaces }, { data: applications }] = await Promise.all([
    supabase.from('event_spaces').select('id, event_id, label, genre, assigned_application_id').in('event_id', eventIds).order('label'),
    supabase.from('applications').select('id, event_id, vendor_id, status, vendor_genre_snapshot').in('event_id', eventIds),
  ])

  const acceptedApplications = (applications ?? []).filter((application) =>
    acceptedApplicationStatuses.includes(application.status as (typeof acceptedApplicationStatuses)[number]),
  )
  const vendorIds = [...new Set(acceptedApplications.map((application) => application.vendor_id))]
  const { data: vendors } = vendorIds.length
    ? await supabase.from('vendors_public').select('id, name, genre').in('id', vendorIds)
    : { data: [] }
  const vendorById = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor]))
  const applicationById = new Map(acceptedApplications.map((application) => [application.id, application]))

  const consoleEvents: DayConsoleEvent[] = events.map((event) => {
    const eventSpaces = (spaces ?? []).filter((space) => space.event_id === event.id)
    const assignedApplicationIds = new Set(eventSpaces.flatMap((space) => space.assigned_application_id ? [space.assigned_application_id] : []))
    const eventApplications = acceptedApplications.filter((application) => application.event_id === event.id)

    const stalls: DayConsoleEvent['stalls'] = eventSpaces.map((space) => {
      const application = space.assigned_application_id ? applicationById.get(space.assigned_application_id) : undefined
      const vendor = application ? vendorById.get(application.vendor_id) : undefined
      return {
        id: space.label,
        name: vendor?.name ?? space.label,
        category: space.genre ?? vendor?.genre ?? 'ジャンル未設定',
        owner: vendor?.name ?? '未割当',
        phone: '連絡先はチャットで確認',
      }
    })

    for (const [index, application] of eventApplications.filter((application) => !assignedApplicationIds.has(application.id)).entries()) {
      const vendor = vendorById.get(application.vendor_id)
      stalls.push({
        id: `受付-${String(index + 1).padStart(2, '0')}`,
        name: vendor?.name ?? '承認済み出店者',
        category: application.vendor_genre_snapshot ?? vendor?.genre ?? 'ジャンル未設定',
        owner: vendor?.name ?? '出店者',
        phone: '連絡先はチャットで確認',
      })
    }

    return {
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      address: [event.prefecture, event.address].filter(Boolean).join(' ') || '会場未設定',
      slug: event.slug ?? undefined,
      stalls,
    }
  })

  return <DayConsole events={consoleEvents} operatorName={profile?.display_name ?? '運営担当者'} />
}
