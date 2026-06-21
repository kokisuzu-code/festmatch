import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BrowseClient from './BrowseClient'

export default async function BrowsePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('events')
    .select('*, event_genre_slots(*)')
    .eq('status', 'published')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })

  const { data: myCars } = await supabase
    .from('kitchen_cars')
    .select('id')
    .eq('owner_id', user.id)

  const carIds = myCars?.map(c => c.id) ?? []
  const { data: myApplications } = carIds.length > 0
    ? await supabase
        .from('applications')
        .select('event_id')
        .in('kitchen_car_id', carIds)
    : { data: [] }

  const appliedEventIds = new Set(myApplications?.map(a => a.event_id) ?? [])

  return (
    <BrowseClient
      events={events ?? []}
      appliedEventIds={appliedEventIds}
    />
  )
}
