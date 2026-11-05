import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { supabase, user, profile } = await getCurrentProfile()
  if (!user || profile?.role !== 'organizer' || !/^[a-f0-9-]{36}$/i.test(eventId)) return NextResponse.json({ error: '主催者としてログインしてください。' }, { status: 403 })
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: event } = organizer ? await supabase.from('events').select('id, booth_bidding_finalized_at').eq('id', eventId).eq('organizer_id', organizer.id).maybeSingle() : { data: null }
  if (!event || event.booth_bidding_finalized_at) return NextResponse.json({ error: 'このイベントの区画図は変更できません。' }, { status: 403 })
  const admin = createAdminClient()
  const { count, error: countError } = await admin.from('booth_bids').select('id', { count: 'exact', head: true }).eq('event_id', eventId)
  if (countError) return NextResponse.json({ error: '応募状況を確認できませんでした。' }, { status: 500 })
  if (count) return NextResponse.json({ error: '応募受付後は区画図を変更できません。' }, { status: 409 })
  try {
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024) throw new Error('8MB以下の画像を選んでください。')
    const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
    const extension = extensions[file.type]
    if (!extension) throw new Error('PNG・JPEG・WebP画像を選んでください。PDFは画像に書き出して添付してください。')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const valid = extension === 'png' ? bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71 : extension === 'jpg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 : String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP'
    if (!valid) throw new Error('画像形式を確認してください。')
    const path = `${eventId}/booth-map-${crypto.randomUUID()}.${extension}`
    const { error } = await admin.storage.from('event-images').upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) throw new Error('区画図をアップロードできませんでした。')
    return NextResponse.json({ path, url: admin.storage.from('event-images').getPublicUrl(path).data.publicUrl })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '画像を保存できませんでした。' }, { status: 400 }) }
}
