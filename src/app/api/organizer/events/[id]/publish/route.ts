import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isEventEnded } from '@/lib/events'
import { hasEventPublicationEntitlement } from '@/lib/organizer-entitlements'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[a-f0-9-]{36}$/i.test(id)) return NextResponse.json({ error: 'イベントが指定されていません。' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  const { data: organizer } = await supabase
    .from('organizers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!organizer) return NextResponse.json({ error: '主催者プロフィールが見つかりません。' }, { status: 403 })
  const { data: event } = await supabase.from('events').select('id, ends_at').eq('id', id).eq('organizer_id', organizer.id).maybeSingle()
  if (!event) return NextResponse.json({ error: 'イベントが見つかりません。' }, { status: 404 })
  if (isEventEnded(event)) return NextResponse.json({ error: '終了済みイベントは公開できません。' }, { status: 409 })
  if (!await hasEventPublicationEntitlement(supabase, organizer.id, event.id)) {
    return NextResponse.json({ error: '公開には年間契約、またはこのイベント用の有効なスポット契約が必要です。' }, { status: 409 })
  }
  const { error } = await supabase.from('events').update({ status: 'published' }).eq('id', id)
  if (error) return NextResponse.json({ error: 'イベントを公開できませんでした。' }, { status: 409 })
  revalidatePath(`/organizer/events/${id}`)
  revalidatePath('/organizer/events')
  revalidatePath('/festmap')
  return NextResponse.json({ ok: true })
}
