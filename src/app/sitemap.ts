import type { MetadataRoute } from 'next'
import { PREFECTURES } from '@/lib/prefectures'
import { createClient } from '@/lib/supabase/server'
import { listFestMapEvents } from '@/lib/festmap'

// The sitemap reads public database rows. Keep it request-time so `next build`
// never needs production Supabase credentials or network access.
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://festmatch.example'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/festmap`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
  ]
  const prefectureRoutes: MetadataRoute.Sitemap = PREFECTURES.map((prefecture) => ({
    url: `${BASE_URL}/festmap/${prefecture.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }))
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) return [...staticRoutes, ...prefectureRoutes]

  const events = await listFestMapEvents(await createClient(), { includeArchived: true })
  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${BASE_URL}/festmap/events/${event.slug}`,
    lastModified: new Date(event.created_at),
    changeFrequency: 'weekly',
    priority: event.is_external ? 0.6 : 0.8,
  }))
  return [...staticRoutes, ...prefectureRoutes, ...eventRoutes]
}
