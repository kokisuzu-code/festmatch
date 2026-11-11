import { z } from 'zod'

const label = z.string().trim().min(1).max(100)
const typography = (min: number, max: number) => z.object({
  desktop: z.number().int().min(min).max(max),
  mobile: z.number().int().min(min).max(max),
  color: z.string().regex(/^#[a-f0-9]{6}$/i),
})

export const sizeLimits = {
  eyebrow: [10, 24], title: [20, 80], description: [12, 32], search: [12, 24],
} as const

export const designSchema = z.object({
  eyebrow: typography(...sizeLimits.eyebrow).extend({ text: label }),
  title: typography(...sizeLimits.title).extend({ text: label }),
  description: typography(...sizeLimits.description).extend({ text: z.string().trim().min(1).max(400) }),
  search: typography(...sizeLimits.search).extend({
    placeholder: label, allPrefectures: label, button: z.string().trim().min(1).max(20),
    buttonBackground: z.string().regex(/^#[a-f0-9]{6}$/i),
  }),
})

export type FestMapDesign = z.infer<typeof designSchema>

export const defaultDesign: FestMapDesign = {
  eyebrow: { text: 'FESTMAP', desktop: 12, mobile: 12, color: '#2c7a78' },
  title: { text: '全国のイベントを探す', desktop: 56, mobile: 32, color: '#17344a' },
  description: { text: '主催者が公開した募集情報と、公式ソースに基づく外部イベントを掲載しています。', desktop: 16, mobile: 16, color: '#69808d' },
  search: { placeholder: 'イベント名・エリア名で検索', allPrefectures: 'すべての都道府県', button: '検索', desktop: 16, mobile: 16, color: '#17344a', buttonBackground: '#2c7a78' },
}

export function readFestMapDesign(value: unknown) {
  return designSchema.safeParse(value).data ?? defaultDesign
}
