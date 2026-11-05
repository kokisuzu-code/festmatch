export const VENDOR_GENRES = [
  '唐揚げ・揚げ物',
  'クレープ・スイーツ',
  'たこ焼き・お好み焼き',
  'カレー・スパイス料理',
  'タコス・メキシカン',
  'やきそば・焼きうどん',
  'ラーメン・麺類',
  'バーガー・サンドイッチ',
  'BBQ・焼き肉・串焼き',
  'ピザ・パスタ',
  'アジアン・エスニック料理',
  '丼・ご飯もの',
  'パン・ベーカリー',
  '餃子・中華料理',
  'アイス・かき氷',
  'コーヒー・ドリンク',
  'アルコール',
  'その他',
] as const

export type VendorGenre = typeof VENDOR_GENRES[number]

export function isVendorGenre(value: unknown): value is VendorGenre {
  return VENDOR_GENRES.some((genre) => genre === value)
}

/** Keep the existing ten default places; newly added categories start closed. */
export function defaultGenreSlots() {
  const capacities: Partial<Record<VendorGenre, number>> = {
    '唐揚げ・揚げ物': 2, 'クレープ・スイーツ': 2,
    'カレー・スパイス料理': 2, 'タコス・メキシカン': 2,
    'コーヒー・ドリンク': 1, 'その他': 1,
  }
  return VENDOR_GENRES.map(genre => ({ genre, capacity: capacities[genre] ?? 0 }))
}

export function completeGenreSlots(slots: { id?: string; genre: string; capacity: number }[]) {
  return VENDOR_GENRES.map(genre => slots.find(slot => slot.genre === genre) ?? { genre, capacity: 0 })
}

/** Unspecified genres have no limit; an explicit zero means no recruitment. */
export function matchesRecruitingGenre(slots: { genre: string; capacity: number }[] | undefined, genre?: string): boolean {
  if (!genre) return true
  const slot = slots?.find((item) => item.genre === genre)
  return !slot || slot.capacity > 0
}
