import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: slots } = await supabaseAdmin
    .from('event_genre_slots')
    .select('id, max_count, approved_count, event_id')
    .eq('discount_active', false)

  if (!slots?.length) return NextResponse.json({ checked: 0, updated: 0 })

  // 締切7日以内のイベントを取得
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, cost_weight, apply_deadline')
    .gt('apply_deadline', today)
    .lt('apply_deadline', sevenDaysLater)

  const eventMap = new Map((events ?? []).map(e => [e.id, e]))

  let updated = 0
  for (const slot of slots) {
    const event = eventMap.get(slot.event_id)
    if (!event) continue

    const fillRate = slot.approved_count / slot.max_count
    if (fillRate <= 0.5) {
      const discountedCost = Math.max(1, Math.floor((event.cost_weight ?? 1) / 3))
      await supabaseAdmin
        .from('event_genre_slots')
        .update({
          discount_active: true,
          original_cost_weight: event.cost_weight,
          current_cost_weight: discountedCost,
        })
        .eq('id', slot.id)
      updated++
    }
  }

  return NextResponse.json({ checked: slots.length, updated })
}
