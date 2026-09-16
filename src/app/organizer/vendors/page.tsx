import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import VendorManagementClient, { type ManagedVendor } from './VendorManagementClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'ベンダー管理',
  description: 'イベントを横断してベンダーの応募、審査、決済、区画、連絡状況を管理します。',
}

export default async function OrganizerVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: requestedStatus } = await searchParams
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase
    .from('organizers')
    .select('id, organization_name')
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: events } = organizer
    ? await supabase
        .from('events')
        .select('id, title, starts_at, ends_at, status')
        .eq('organizer_id', organizer.id)
        .order('starts_at', { ascending: false })
    : { data: [] }

  const eventIds = (events ?? []).map((event) => event.id)
  const { data: applications } = eventIds.length
    ? await supabase
        .from('applications')
        .select('id, event_id, vendor_id, status, created_at, updated_at, vendor_genre_snapshot')
        .in('event_id', eventIds)
        .order('updated_at', { ascending: false })
    : { data: [] }

  const vendorIds = [...new Set((applications ?? []).map((application) => application.vendor_id))]
  const [{ data: vendors }, { data: spaces }] = await Promise.all([
    vendorIds.length
      ? supabase
          .from('vendors_public')
          .select('id, name, slug, genre, prefecture, website_url, instagram_url')
          .in('id', vendorIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase
          .from('event_spaces')
          .select('event_id, label, assigned_application_id')
          .in('event_id', eventIds)
      : Promise.resolve({ data: [] }),
  ])

  const eventById = new Map((events ?? []).map((event) => [event.id, event]))
  const vendorById = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor]))
  const spaceByApplicationId = new Map(
    (spaces ?? []).flatMap((space) =>
      space.assigned_application_id ? [[space.assigned_application_id, space] as const] : [],
    ),
  )

  const managedVendors: ManagedVendor[] = (applications ?? []).map((application) => {
    const vendor = vendorById.get(application.vendor_id)
    const event = eventById.get(application.event_id)
    const space = spaceByApplicationId.get(application.id)
    return {
      applicationId: application.id,
      vendorId: application.vendor_id,
      name: vendor?.name ?? 'ベンダー',
      slug: vendor?.slug ?? null,
      genre: application.vendor_genre_snapshot ?? vendor?.genre ?? 'ジャンル未設定',
      prefecture: vendor?.prefecture ?? null,
      eventId: application.event_id,
      eventTitle: event?.title ?? 'イベント',
      eventDate: event?.starts_at ?? null,
      status: application.status,
      appliedAt: application.created_at,
      spaceLabel: space?.label ?? null,
    }
  })

  const eventOptions = (events ?? []).map((event) => ({ id: event.id, title: event.title }))

  return (
    <div className="dashboard-stack">
      <section className="dashboard-hero vendor-dashboard-hero">
        <div>
          <p className="eyebrow">VENDOR MANAGEMENT</p>
          <h1>ベンダー管理</h1>
          <p>{organizer?.organization_name ?? '主催者'}のイベントに関わる出店者を、イベント横断で確認できます。</p>
        </div>
        <div className="button-row">
          <Link className="button button-secondary" href="/organizer/events">イベント管理</Link>
          <Link className="button button-primary" href="/organizer/events/new">募集を作成</Link>
        </div>
      </section>
      <VendorManagementClient
        vendors={managedVendors}
        events={eventOptions}
        initialStatus={requestedStatus ?? 'all'}
      />
    </div>
  )
}
