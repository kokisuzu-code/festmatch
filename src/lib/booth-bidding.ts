import { z } from 'zod'
import { VENDOR_GENRES } from './genres.ts'

export type BoothSpace = { id: string; label: string; genre: string | null; minimum_fee_yen: number; map_x: number; map_y: number; map_width?: number | null; map_height?: number | null; assigned_application_id?: string | null }
export type BoothBid = { id: string; vendor_id: string; genre: string; amount_yen: number; amount_submitted_at: string; preferences: string[]; message: string | null; status: string; version: number; application_id: string | null }
export type GenreCap = { genre: string; capacity: number }
export const boothBidSchema = z.object({ amount: z.number().int().min(1000).max(1000000).multipleOf(1000), preferences: z.array(z.string().uuid()).min(1).max(3).refine(ids => new Set(ids).size === ids.length), message: z.string().trim().max(2000).default(''), version: z.number().int().nonnegative(), accepted: z.literal(true) }).strict()
export const boothConfigSchema = z.object({ version: z.number().int().nonnegative(), enabled: z.boolean(), mapPath: z.string().max(512).nullable(), spaces: z.array(z.object({ label: z.string().trim().min(1).max(80), genre: z.enum(VENDOR_GENRES).nullable(), minimum_fee_yen: z.number().int().min(1000).max(1000000).multipleOf(1000), map_x: z.number().min(0).max(100), map_y: z.number().min(0).max(100), map_width: z.number().min(2).max(25).nullable().optional(), map_height: z.number().min(2).max(25).nullable().optional() }).strict()).max(100), slots: z.array(z.object({ genre: z.enum(VENDOR_GENRES), capacity: z.number().int().min(0).max(1000) }).strict()).max(100) }).strict().refine(config => new Set(config.slots.map(slot => slot.genre)).size === config.slots.length, { message: '同じジャンルの枠は1つだけ登録できます。' })

function submittedMicros(value: string) {
  const fraction = value.match(/\.(\d+)(?:Z|[+-]\d{2}(?::?\d{2})?)$/)?.[1] ?? ''
  return Date.parse(value) * 1000 + Number(fraction.padEnd(6, '0').slice(3, 6))
}

/** Preview only; the database repeats this ordering under an event row lock. */
export function allocateBoothBids(bids: BoothBid[], spaces: BoothSpace[], slots: GenreCap[], capacity: number | null) {
  const used = new Set<string>(), counts = new Map<string, number>()
  return [...bids].sort((a,b) => b.amount_yen-a.amount_yen || submittedMicros(a.amount_submitted_at)-submittedMicros(b.amount_submitted_at) || a.id.localeCompare(b.id)).map(bid => {
    const cap = (slots.length ? slots.find(slot => slot.genre === bid.genre)?.capacity ?? 0 : Infinity)
    const target = (counts.get(bid.genre) ?? 0) < cap && (capacity === null || used.size < capacity)
      ? bid.preferences.map(id => spaces.find(space => space.id === id)).find(space => space && (!space.genre || space.genre === bid.genre) && space.minimum_fee_yen <= bid.amount_yen && !used.has(space.id)) : undefined
    if (target) { used.add(target.id); counts.set(bid.genre, (counts.get(bid.genre) ?? 0) + 1) }
    return { ...bid, spaceId: target?.id ?? null }
  })
}

/** Returns prices only, never another vendor's identity or individual bid. */
export function boothMaximums(bids: BoothBid[], spaces: BoothSpace[]) {
  return Object.fromEntries(spaces.map(space => [space.id, Math.max(0, ...bids.filter(bid => (!space.genre || bid.genre === space.genre) && bid.preferences.includes(space.id) && bid.amount_yen >= space.minimum_fee_yen).map(bid => bid.amount_yen))]))
}
export function bidFingerprint(bids: Pick<BoothBid, 'id' | 'version'>[]) {
  return [...bids].sort((a,b) => a.id.localeCompare(b.id)).map(bid => `${bid.id}:${bid.version}`).join(',')
}
