import { z } from 'zod'
import { VENDOR_GENRES } from './genres.ts'

export const boothImportSchema = z.object({ spaces: z.array(z.object({
  label: z.string().trim().min(1).max(80), map_x: z.number().min(0).max(100), map_y: z.number().min(0).max(100),
  map_width: z.number().min(2).max(25).optional(), map_height: z.number().min(2).max(25).optional(),
})).min(1).max(100) }).refine(value => new Set(value.spaces.map(space => space.label)).size === value.spaces.length, { message:'区画番号が重複しています。' })

export function parseBoothImport(value: unknown, fee: number, genreEnabled: boolean) {
  const parsed = boothImportSchema.safeParse(value)
  if (!parsed.success) throw new Error('区画番号と位置があるJSONを貼り付けてください。区画は1〜100件、番号は重複できません。')
  return parsed.data.spaces.map(space => ({ ...space, id:crypto.randomUUID(), genre:genreEnabled ? VENDOR_GENRES[0] : null, minimum_fee_yen:fee }))
}
