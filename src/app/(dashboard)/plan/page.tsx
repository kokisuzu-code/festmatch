import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrganizerSidebarNav from '@/components/OrganizerSidebarNav'
import PlanCheckoutButton from './PlanCheckoutButton'

export const dynamic = 'force-dynamic'

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const nameChar = (profile?.name ?? user.email ?? '?')[0].toUpperCase()
  const currentPlan = subscription?.plan ?? 'free'
  const isOrganizer = profile?.role === 'organizer'

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
                  {currentPlan === 'organizer_annual' ? '年間契約プラン' : 'スポットプラン（3ヶ月）'}
                </p>
                {subscription.period_end && (
                  <p className="text-xs text-green-600 mt-0.5">
                    次回更新 / 終了: {subscription.period_end}
                  </p>
                )}
              </div>
              <span className="text-xs bg-green-200 text-green-800 px-3 py-1 rounded-full font-medium">有効</span>
            </div>
          )}

          {/* プランカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            {/* 年間契約 */}
            <div className={`bg-white rounded-2xl border-2 p-6 ${currentPlan === 'organizer_annual' ? 'border-green-400' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">年間契約</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">¥120,000<span className="text-sm font-normal text-gray-500">/月</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">年間 ¥1,440,000（月払い）</p>
                </div>
                {currentPlan === 'organizer_annual' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">契約中</span>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {['冬場も安定した月額収入', 'イベント数・応募数 無制限', '出店料の自動徴収（10%）', 'チャット・書類審査機能', '優先サポート'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <PlanCheckoutButton
                planType="organizer_annual"
                userId={user.id}
                disabled={currentPlan === 'organizer_annual'}
                label={currentPlan === 'organizer_annual' ? '契約中' : '年間契約を開始'}
                customerId={profile?.stripe_customer_id ?? undefined}
              />
            </div>

            {/* スポット */}
            <div className={`bg-white rounded-2xl border-2 p-6 ${currentPlan === 'organizer_spot' ? 'border-green-400' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">スポット（3ヶ月）</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">¥250,000<span className="text-sm font-normal text-gray-500">/月</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">3ヶ月合計 ¥750,000・自動終了</p>
                </div>
                {currentPlan === 'organizer_spot' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">契約中</span>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {['年1回開催でも使える', 'イベント数・応募数 無制限', '出店料の自動徴収（10%）', 'チャット・書類審査機能', '3ヶ月後に自動終了'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <PlanCheckoutButton
                planType="organizer_spot"
                userId={user.id}
                disabled={currentPlan === 'organizer_spot'}
                label={currentPlan === 'organizer_spot' ? '契約中' : 'スポット契約を開始'}
                customerId={profile?.stripe_customer_id ?? undefined}
              />
            </div>
          </div>

          {/* 請求管理 */}
          {profile?.stripe_customer_id && (
            <div className="mt-6 max-w-3xl">
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

          <p className="text-xs text-gray-400 mt-6 max-w-3xl">
            ※ 最初の3ヶ月は無料トライアルでご利用いただけます（営業担当よりご案内）。
            契約はStripeが管理します。解約はいつでも請求管理画面から行えます。
          </p>
        </main>
      </div>
    </div>
  )
}
