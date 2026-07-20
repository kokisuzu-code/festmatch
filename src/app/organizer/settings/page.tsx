import { requireRole } from '@/lib/auth'
import OrganizerBillingControls from '@/components/organizer/OrganizerBillingControls'
import { yen } from '@/lib/app'

export const dynamic = 'force-dynamic'
export const metadata = { title: '主催者設定', description: 'FestMatchの主催者プロフィールとStripe Connectを設定します。' }

export default async function OrganizerSettingsPage() {
  const { supabase, user } = await requireRole('organizer')
  const { data: organizer } = await supabase
    .from('organizers')
    .select('organization_name, contact_name, contact_email, billing_plan, billing_status, stripe_subscription_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  return (
    <div className="dashboard-stack">
      <section className="dashboard-hero"><div><p className="eyebrow">ORGANIZER SETTINGS</p><h1>主催者設定</h1><p>{organizer?.organization_name ?? '主催者'} の公開・請求設定を確認できます。</p></div></section>
      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">PAYOUTS</p><h2>出店料の受取設定</h2></div><span className="status">準備中</span></div>
        <p className="panel-copy">現在のリモートスキーマには主催者の Stripe Connect 受取先を安全に保持する列がないため、有料出店料の決済は無効化されています。資金フローを確定し、専用マイグレーションを適用してから有効化します。</p>
      </section>
      <section className="panel form-stack">
        <div className="section-heading"><div><p className="eyebrow">EMBED SECURITY</p><h2>埋め込み許可ドメイン</h2></div></div>
        <p className="panel-copy">iframe の許可 Origin はデプロイ環境の <code>FESTMATCH_EMBED_ALLOWED_ORIGINS</code> で一元管理します。空欄では CSP により埋め込みを拒否します。</p>
      </section>
      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">PLAN</p><h2>ご契約</h2></div></div>
        <p className="panel-copy">
          {organizer?.billing_plan === 'annual'
            ? `年間契約: ${yen(120000)}/月`
            : `年間契約またはスポット契約を選択できます。スポット契約はイベントごとに ${yen(250000)} を一括決済し、利用期間は最大3か月です。`}
          {organizer?.billing_status ? `（${organizer.billing_status}）` : ''}
        </p>
        {!(organizer?.billing_plan === 'annual' && organizer.billing_status === 'active') && <OrganizerBillingControls />}
      </section>
    </div>
  )
}
