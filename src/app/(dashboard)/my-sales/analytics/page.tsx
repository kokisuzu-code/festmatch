import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export default async function SalesAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 過去12ヶ月分の売上記録を取得
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const { data: records } = await supabase
    .from('sales_records')
    .select('*, kitchen_cars(genre)')
    .eq('owner_id', user.id)
    .gte('event_date', oneYearAgo.toISOString().split('T')[0])
    .order('event_date', { ascending: false })

  // メインのキッチンカーのジャンル
  const { data: myCars } = await supabase
    .from('kitchen_cars')
    .select('genre')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  return (
    <AnalyticsClient
      records={(records ?? []) as any}
      kitchenCarGenre={myCars?.genre ?? null}
    />
  )
}
