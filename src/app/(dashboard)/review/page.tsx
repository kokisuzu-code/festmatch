import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReviewClient from './ReviewClient'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'organizer') redirect('/dashboard')

  const { data: cars } = await supabase
    .from('kitchen_cars')
    .select('id, name, genre, verified_status, reject_reason, verified_at, profiles(name)')
    .in('verified_status', ['pending', 'approved', 'rejected'])
    .order('verified_status', { ascending: true })

  const carIds = (cars ?? []).map(c => c.id)

  const { data: documents } = carIds.length > 0
    ? await supabase
        .from('kitchen_car_documents')
        .select('*')
        .in('kitchen_car_id', carIds)
        .order('uploaded_at', { ascending: true })
    : { data: [] }

  return <ReviewClient cars={cars ?? []} documents={documents ?? []} />
}
