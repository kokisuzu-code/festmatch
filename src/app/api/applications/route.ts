import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { event_id, slot_id, vendor_id, message } = await request.json()

  const admin = createAdminClient()

  // ベンダーのサブスク有効チェック
  const { data: sub } = await admin
    .from('subscriptions')
    .select('status')
    .eq('user_id', vendor_id)
    .eq('status', 'active')
    .single()

  if (!sub) {
    return NextResponse.json(
      { success: false, error: 'SUBSCRIPTION_REQUIRED', message: '有効なサブスクリプションが必要です' },
      { status: 403 }
    )
  }

  // イベントの申請受付期間チェック
  const { data: event } = await admin
    .from('events')
    .select('application_deadline, status')
    .eq('id', event_id)
    .single()

  if (!event || event.status === 'closed' || (event.application_deadline && new Date(event.application_deadline) < new Date())) {
    return NextResponse.json(
      { success: false, error: 'EVENT_CLOSED', message: '申請受付期間外です' },
      { status: 400 }
    )
  }

  // 重複申請チェック
  const { data: existing } = await admin
    .from('applications')
    .select('id')
    .eq('slot_id', slot_id)
    .eq('vendor_id', vendor_id)
    .single()

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'ALREADY_APPLIED', message: 'すでにこのスロットに申請済みです' },
      { status: 409 }
    )
  }

  // スロット情報取得（SELECT FOR UPDATE は Supabase RPC で代替）
  const { data: slot } = await admin
    .from('event_slots')
    .select('max_applications, current_applications_count')
    .eq('id', slot_id)
    .single()

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  if (slot.current_applications_count >= slot.max_applications) {
    return NextResponse.json(
      { success: false, error: 'SLOT_FULL', message: 'このスロットはすでに申請上限に達しています' },
      { status: 409 }
    )
  }

  // 申請INSERT + カウントインクリメント
  const { data: application, error: insertError } = await admin
    .from('applications')
    .insert({
      event_id,
      slot_id,
      vendor_id,
      message: message ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[applications] insert error', insertError)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }

  await admin
    .from('event_slots')
    .update({ current_applications_count: slot.current_applications_count + 1 })
    .eq('id', slot_id)

  return NextResponse.json({ success: true, application_id: application.id, status: 'pending' })
}
