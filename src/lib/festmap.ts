import type { SupabaseClient } from '@supabase/supabase-js'
import type { PublicEvent } from '@/components/festmap/PublicEventCard'

const INTERNAL_EVENT_COLUMNS = 'id, slug, title, description, prefecture, address, starts_at, ends_at, application_deadline_at, booth_fee_yen, latitude, longitude, created_at'
const EXTERNAL_EVENT_COLUMNS = 'id, slug, title, description, prefecture, address, starts_at, ends_at, official_url, latitude, longitude, created_at'

type FestMapFilters = { prefecture?: string; query?: string; includeArchived?: boolean }

function upcomingOnly<T extends { gte: (column: string, value: string) => T }>(query: T, includeArchived: boolean) {
  return includeArchived ? query : query.gte('ends_at', new Date().toISOString())
}

export async function listFestMapEvents(supabase: SupabaseClient, filters: FestMapFilters = {}) {
  let internal = upcomingOnly(
    supabase.from('events').select(INTERNAL_EVENT_COLUMNS).eq('status', 'published'),
    Boolean(filters.includeArchived),
  )
  let external = upcomingOnly(
    supabase.from('external_events').select(EXTERNAL_EVENT_COLUMNS).eq('status', 'published'),
    Boolean(filters.includeArchived),
  )
  if (filters.prefecture) {
    internal = internal.eq('prefecture', filters.prefecture)
    external = external.eq('prefecture', filters.prefecture)
  }
  if (filters.query) {
    internal = internal.ilike('title', `%${filters.query}%`)
    external = external.ilike('title', `%${filters.query}%`)
  }

  const [{ data: internalEvents }, { data: externalEvents }] = await Promise.all([
    internal.order('starts_at').limit(100),
    external.order('starts_at').limit(100),
  ])
  return [
    ...(internalEvents ?? []).map((event) => ({ ...event, is_external: false, official_url: null })),
    ...(externalEvents ?? []).map((event) => ({ ...event, application_deadline_at: null, booth_fee_yen: null, is_external: true })),
  ]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()) as PublicEvent[]
}

export async function getFestMapEventBySlug(supabase: SupabaseClient, slug: string) {
  const { data: internal } = await supabase
    .from('events')
    .select(INTERNAL_EVENT_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (internal) return { ...internal, is_external: false, official_url: null } as PublicEvent

  const { data: external } = await supabase
    .from('external_events')
    .select(EXTERNAL_EVENT_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return external ? { ...external, application_deadline_at: null, booth_fee_yen: null, is_external: true } as PublicEvent : null
}
