import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentsClient from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: car } = await supabase
    .from('kitchen_cars')
    .select('id, name, verified_status, reject_reason')
    .eq('owner_id', user.id)
    .single()

  if (!car) redirect('/kitchen-cars/new')

  const { data: documents } = await supabase
    .from('kitchen_car_documents')
    .select('*')
    .eq('kitchen_car_id', car.id)
    .order('uploaded_at', { ascending: false })

  return (
    <DocumentsClient
      car={car}
      documents={documents ?? []}
      userId={user.id}
    />
  )
}
