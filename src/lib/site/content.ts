import { z } from 'zod'

const headline = z.string().trim().min(1).max(100)
const text = z.string().trim().max(400)
const media = z.string().trim().max(500).refine(value => value.startsWith('/reference/') || /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/site-media\//.test(value), 'アップロードした写真を選んでください')

export const siteContentSchema = z.object({
  eyebrow: headline,
  headline: headline,
  lead: z.string().trim().min(1).max(260),
  heroImage: media,
  heroAlt: headline,
  aboutTitle: headline,
  aboutText: z.string().trim().min(1).max(400),
  featureOneTitle: headline,
  featureOneText: text,
  featureTwoTitle: headline,
  featureTwoText: text,
  news: z.array(z.object({ title: headline, body: z.string().trim().min(1).max(1000), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).max(8),
}).strict()

export type SiteContent = z.infer<typeof siteContentSchema>

export const defaultSiteContent: SiteContent = {
  eyebrow: '街の予定を、ひとつの場所に。',
  headline: '週末が、近くなる。',
  lead: 'いつもの街にも、まだ知らない楽しみがある。場所と日付から、ふらっと行ける予定を探せます。',
  heroImage: '/reference/waterfront-market.webp',
  heroAlt: '港沿いで開かれる朝市のイメージ写真',
  aboutTitle: '街の楽しみと、つながる。',
  aboutText: 'FestMatchは、イベントを探す人、開催する人、出店する人のための場所です。近くで開かれる催しを見つけて、いつもの週末に新しい選択肢を。',
  featureOneTitle: '行きたいイベントを見つける',
  featureOneText: '地域やキーワードから、これから開催されるイベントを探せます。',
  featureTwoTitle: '開催・出店をつなぐ',
  featureTwoText: '主催者は募集を掲載し、出店者は出店先に応募できます。',
  news: [],
}

export function parseSiteContent(input: unknown): SiteContent {
  return siteContentSchema.safeParse(input).data ?? defaultSiteContent
}
