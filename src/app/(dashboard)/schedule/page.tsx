import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 自分のキッチンカー
  const { data: myCars } = await supabase
    .from('kitchen_cars')
    .select('id')
    .eq('owner_id', user.id)

  const carIds = myCars?.map(c => c.id) ?? []

  // 全応募（過去含む）
  const { data: applications } = carIds.length > 0
    ? await supabase
        .from('applications')
        .select('id, status, events(id, title, date, start_time, end_time, location, prefecture, fee, has_power, has_water)')
        .in('kitchen_car_id', carIds)
        .in('status', ['approved', 'pending'])
        .order('applied_at', { ascending: false })
    : { data: [] }

  // 今月の売上
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { data: salesRecords } = await supabase
    .from('sales_records')
    .select('sales_amount')
    .eq('owner_id', user.id)
    .gte('event_date', `${monthStr}-01`)

  const thisMonthSales = (salesRecords ?? []).reduce((s: number, r: any) => s + (r.sales_amount ?? 0), 0)
  const salesCount = salesRecords?.length ?? 0

  return (
    <ScheduleClient
      applications={(applications ?? []) as any}
      thisMonthSales={thisMonthSales}
      salesCount={salesCount}
    />
  )
}
