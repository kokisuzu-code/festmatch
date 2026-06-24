import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id } = await req.json()

  const { data: original } = await supabase
    .from('events')
    .select('*, event_genre_slots(*)')
    .eq('id', event_id)
    .eq('organizer_id', user.id)
    .single()

  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: newEvent, error } = await supabase
    .from('events')
    .insert({
      organizer_id:         user.id,
      title:                `${original.title}（コピー）`,
      location:             original.location,
      prefecture:           original.prefecture,
      expected_visitors:    original.expected_visitors,
      total_slots:          original.total_slots,
      fee:                  original.fee,
      has_power:            original.has_power,
      has_water:            original.has_water,
      has_parking:          original.has_parking,
      cancel_policy:        original.cancel_policy,
      cost_weight:          original.cost_weight,
      tier:                 original.tier,
      status:               'draft',
      copied_from_event_id: original.id,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (original.event_genre_slots?.length) {
    await supabase.from('event_genre_slots').insert(
      original.event_genre_slots.map((slot: any) => ({
        event_id:       newEvent.id,
        genre:          slot.genre,
        max_count:      slot.max_count,
        approved_count: 0,
      }))
    )
  }

  return NextResponse.json({ event: newEvent })
}
