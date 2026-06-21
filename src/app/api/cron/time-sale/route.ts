import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SLOTS = 100

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // 開催日まで14日以内 かつ 充足率50%未満のスロットを取得
  const { data: slots, error } = await supabase
    .from('event_slots')
    .select(`
      id,
      cost_weight,
      max_applications,
      current_applications_count,
      events!inner (
        id,
        name,
        date,
        organizer_email,
        organizer_name
      )
    `)
    .lte('events.date', cutoff)
    .gte('events.date', now.toISOString())
    .limit(MAX_SLOTS)

  if (error) {
    console.error('[cron/time-sale] fetch error', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const updatedSlots: Array<{
    slot_id: string
    event_name: string
    old_weight: number
    new_weight: number
  }> = []

  for (const slot of slots ?? []) {
    const fillRate = slot.max_applications > 0
      ? slot.current_applications_count / slot.max_applications
      : 1

    if (fillRate >= 0.5) continue

    const newWeight = fillRate < 0.3
      ? slot.cost_weight * 0.4
      : slot.cost_weight * 0.6

    await supabase
      .from('event_slots')
      .update({ cost_weight: newWeight })
      .eq('id', slot.id)

    const ev = Array.isArray(slot.events) ? slot.events[0] : slot.events as {
      id: string; name: string; date: string; organizer_email: string; organizer_name: string
    }

    updatedSlots.push({
      slot_id: slot.id,
      event_name: ev.name,
      old_weight: slot.cost_weight,
      new_weight: newWeight,
    })

    // リマインダーメール送信
    const daysUntil = Math.ceil(
      (new Date(ev.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notify/reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        event_id: ev.id,
        organizer_email: ev.organizer_email,
        organizer_name: ev.organizer_name,
        event_name: ev.name,
        days_until_event: daysUntil,
        fill_rate: fillRate,
      }),
    })
  }

  return NextResponse.json({ processed: updatedSlots.length, updated_slots: updatedSlots })
}
