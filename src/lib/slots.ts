import { createAdminClient } from '@/lib/supabase/admin'

export const acceptedApplicationStatuses = ['approved', 'paid'] as const

export type GenreSlotAvailability = {
  id: string
  eventId: string
  genre: string
  capacity: number
  approvedCount: number
  remaining: number
  isFull: boolean
}

/**
 * Returns only the aggregate needed to show availability. This is intentionally
 * server-only: vendors never receive other vendors' application records.
 */
export async function getGenreSlotAvailability(eventIds: string[]) {
  const availability = new Map<string, GenreSlotAvailability[]>()
  if (!eventIds.length) return availability

  const admin = createAdminClient()
  const [{ data: slots, error: slotsError }, { data: applications, error: applicationsError }] = await Promise.all([
    admin
      .from('event_genre_slots')
      .select('id, event_id, genre, capacity')
      .in('event_id', eventIds),
    admin
      .from('applications')
      .select('event_id, vendor_genre_snapshot, status')
      .in('event_id', eventIds)
      .in('status', acceptedApplicationStatuses),
  ])

  if (slotsError) throw new Error('ジャンル枠を取得できませんでした。')
  if (applicationsError) throw new Error('ジャンル枠の利用状況を取得できませんでした。')

  const countByEventAndGenre = new Map<string, number>()
  for (const application of applications ?? []) {
    if (!application.vendor_genre_snapshot) continue
    const key = `${application.event_id}:${application.vendor_genre_snapshot}`
    countByEventAndGenre.set(key, (countByEventAndGenre.get(key) ?? 0) + 1)
  }

  for (const slot of slots ?? []) {
    const approvedCount = countByEventAndGenre.get(`${slot.event_id}:${slot.genre}`) ?? 0
    const item: GenreSlotAvailability = {
      id: slot.id,
      eventId: slot.event_id,
      genre: slot.genre,
      capacity: slot.capacity,
      approvedCount,
      remaining: Math.max(0, slot.capacity - approvedCount),
      isFull: approvedCount >= slot.capacity,
    }
    availability.set(slot.event_id, [...(availability.get(slot.event_id) ?? []), item])
  }

  return availability
}

export function findGenreSlotAvailability(
  slots: GenreSlotAvailability[] | undefined,
  genre: string | null | undefined,
) {
  if (!genre) return undefined
  return slots?.find((slot) => slot.genre === genre)
}
