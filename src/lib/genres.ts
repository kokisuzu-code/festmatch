export const VENDOR_GENRES = [
  '唐揚げ・揚げ物',
  'クレープ・スイーツ',
  'カレー・スパイス料理',
  'タコス・メキシカン',
  'コーヒー・ドリンク',
  'その他',
] as const

export function isVendorGenre(value: string): boolean {
  return VENDOR_GENRES.some((genre) => genre === value)
}

/** Unspecified genres have no limit; an explicit zero means no recruitment. */
export function matchesRecruitingGenre(slots: { genre: string; capacity: number }[] | undefined, genre?: string): boolean {
  if (!genre) return true
  const slot = slots?.find((item) => item.genre === genre)
  return !slot || slot.capacity > 0
}
