import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const today = new Date()

  // 期限切れの繰り越しコストをリセット
  await supabaseAdmin
    .from('subscriptions')
    .update({ carry_over_cost: 0, carry_over_expires_at: null })
    .lt('carry_over_expires_at', today.toISOString().split('T')[0])
    .neq('plan', 'pro')

  // 今月の使用コストをリセット・余剰分を繰り越しへ
  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select('id, plan, cost_limit, cost_used, carry_over_cost')
    .eq('status', 'active')
    .neq('plan', 'pro')

  const COST_LIMITS: Record<string, number> = { light: 10, standard: 30 }

  for (const sub of subs ?? []) {
    const limit    = COST_LIMITS[sub.plan] ?? 10
    const unused   = Math.max(0, limit - sub.cost_used)
    const maxCarry = limit * 3
    const newCarry = Math.min((sub.carry_over_cost ?? 0) + unused, maxCarry)

    // 繰り越し有効期限は3ヶ月後の月末
    const expires = new Date(today.getFullYear(), today.getMonth() + 3, 0)

    await supabaseAdmin
      .from('subscriptions')
      .update({
        cost_used: 0,
        carry_over_cost: newCarry,
        carry_over_expires_at: expires.toISOString().split('T')[0],
      })
      .eq('id', sub.id)
  }

  return NextResponse.json({ processed: subs?.length ?? 0 })
}
