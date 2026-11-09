export type EventDetails = { venue_name?: string; host_message?: string; requirements?: string; loading_info?: string; [key: string]: unknown }

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  if (/^https?:\/\//.test(path) || path.startsWith('/event-maps/')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? `${base}/storage/v1/object/public/event-images/${path.split('/').map(encodeURIComponent).join('/')}` : null
}

export function tokyoDateTime(value?: string | null) {
  if (!value) return ''
  return new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 16)
}

export function parseTokyoDate(value: string) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('日時を確認してください。')
  const date = new Date(`${value}:00+09:00`)
  if (Number.isNaN(date.getTime()) || tokyoDateTime(date.toISOString()) !== value) throw new Error('日時を確認してください。')
  return date.toISOString()
}
