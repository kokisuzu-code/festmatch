import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrganizerSidebarNav from '@/components/OrganizerSidebarNav'
import PlanCheckoutButton from './PlanCheckoutButton'

export const dynamic = 'force-dynamic'

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, role, stripe_customer_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('subscriptions')
      .select('plan, status, period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single(),
  ])

  const nameChar = (profile?.name ?? user.email ?? '?')[0].toUpperCase()
  const currentPlan = subscription?.plan ?? 'free'

  const planLabels: Record<string, string> = {
    light: 'ライト',
    standard: 'スタンダード',
    pro: 'プロ',
    free: '無料',
  }

  return (
    <div className="light-theme flex h-screen overflow-hidden bg-gray-50">
      <OrganizerSidebarNav nameChar={nameChar} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
          <h1 className="text-sm font-semibold text-gray-700">プランと請求</h1>
          <p className="text-xs text-gray-400 mt-0.5">主催者向けSaaSプラン</p>
        </header>

        <main className="flex-1 overflow-auto px-6 py-6">
          {/* 現在のプラン */}
          {subscription && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">現在のプラン</p>
                <p className="text-sm font-semibold text-green-800 mt-0.5">
                  {planLabels[currentPlan] ?? currentPlan}プラン
                </p>
                {subscription.period_end && (
                  <p className="text-xs text-green-600 mt-0.5">
                    次回更新: {subscription.period_end}
                  </p>
                )}
              </div>
              <span className="text-xs bg-green-200 text-green-800 px-3 py-1 rounded-full font-medium">有効</span>
            </div>
          )}

          {/* プランカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
            {/* ライト */}
            <div className={`bg-white rounded-2xl border-2 p-6 ${currentPlan === 'light' ? 'border-green-400' : 'border-gray-200'}`}>
              <div className="mb-4">
                <p className="text-xs text-gray-500 font-medium">ライト</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">¥9,800<span className="text-sm font-normal text-gray-500">/月</span></p>
                <p className="text-xs text-gray-400 mt-0.5">月間コスト上限 10</p>
              </div>
              <ul className="space-y-2 mb-6">
                {['月10コストまで応募受付', 'イベント作成・管理', 'チャット・書類審査', '基本サポート'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <PlanCheckoutButton
                planType="light"
                userId={user.id}
                disabled={currentPlan === 'light'}
                label={currentPlan === 'light' ? '契約中' : 'ライトを開始'}
                customerId={profile?.stripe_customer_id ?? undefined}
              />
            </div>

            {/* スタンダード */}
            <div className={`bg-white rounded-2xl border-2 p-6 relative ${currentPlan === 'standard' ? 'border-green-400' : 'border-gray-900'}`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gray-900 text-white text-xs px-3 py-1 rounded-full font-medium">人気</span>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-500 font-medium">スタンダード</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">¥24,800<span className="text-sm font-normal text-gray-500">/月</span></p>
                <p className="text-xs text-gray-400 mt-0.5">月間コスト上限 30</p>
              </div>
              <ul className="space-y-2 mb-6">
                {['月30コストまで応募受付', 'イベント作成・管理', 'チャット・書類審査', 'タイムセール自動化', '優先サポート'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <PlanCheckoutButton
                planType="standard"
                userId={user.id}
                disabled={currentPlan === 'standard'}
                label={currentPlan === 'standard' ? '契約中' : 'スタンダードを開始'}
                customerId={profile?.stripe_customer_id ?? undefined}
              />
            </div>

            {/* プロ */}
            <div className={`bg-white rounded-2xl border-2 p-6 ${currentPlan === 'pro' ? 'border-green-400' : 'border-gray-200'}`}>
              <div className="mb-4">
                <p className="text-xs text-gray-500 font-medium">プロ</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">¥49,800<span className="text-sm font-normal text-gray-500">/月</span></p>
                <p className="text-xs text-gray-400 mt-0.5">コスト無制限</p>
              </div>
              <ul className="space-y-2 mb-6">
                {['コスト無制限', 'イベント数・応募数 無制限', 'チャット・書類審査', 'タイムセール自動化', '専任サポート'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <PlanCheckoutButton
                planType="pro"
                userId={user.id}
                disabled={currentPlan === 'pro'}
                label={currentPlan === 'pro' ? '契約中' : 'プロを開始'}
                customerId={profile?.stripe_customer_id ?? undefined}
              />
            </div>
          </div>

          {/* 請求管理 */}
          {profile?.stripe_customer_id && (
            <div className="mt-6 max-w-4xl">
              <PlanCheckoutButton
                planType="portal"
                userId={user.id}
                disabled={false}
                label="請求履歴・カード変更"
                customerId={profile.stripe_customer_id}
                variant="ghost"
              />
            </div>
          )}

          <p className="text-xs text-gray-400 mt-6 max-w-4xl">
            契約はStripeが管理します。解約はいつでも請求管理画面から行えます。
          </p>
        </main>
      </div>
    </div>
  )
}
