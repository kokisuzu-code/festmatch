'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { createEventSlug } from '@/lib/events'

function value(formData: FormData, field: string) {
  return String(formData.get(field) ?? '').trim()
}

export async function createExternalEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const title = value(formData, 'title')
  const prefecture = value(formData, 'prefecture')
  const official = value(formData, 'official_url')
  const source = value(formData, 'source_url')
  const startsAt = value(formData, 'starts_at')
  const endsAt = value(formData, 'ends_at')
  if (!title || !prefecture || !official || !source || !startsAt || !endsAt) throw new Error('必須項目を入力してください。')
  if (title.length > 120 || new Date(endsAt) <= new Date(startsAt)) throw new Error('イベント名と開催日時を確認してください。')
  let officialUrl: URL
  let sourceUrl: URL
  try {
    officialUrl = new URL(official)
    sourceUrl = new URL(source)
  } catch {
    throw new Error('公式URLと確認元URLを確認してください。')
  }
  if (!['https:', 'http:'].includes(officialUrl.protocol) || !['https:', 'http:'].includes(sourceUrl.protocol)) throw new Error('URLはhttpまたはhttpsを指定してください。')

  const { error } = await supabase.from('external_events').insert({
    slug: createEventSlug(title),
    title,
    prefecture,
    address: value(formData, 'address') || null,
    description: value(formData, 'description') || null,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    official_url: officialUrl.toString(),
    source_url: sourceUrl.toString(),
    status: 'published',
    verified_at: new Date().toISOString(),
    verified_by: user.id,
  })
  if (error) throw new Error('外部イベントを登録できませんでした。')
  redirect('/admin/festmap?created=1')
}
