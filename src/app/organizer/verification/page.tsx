export const metadata = { title: '審査・認証', description: '主催者アカウントの認証状況を確認します。' }

export default function OrganizerVerificationPage() {
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">VERIFICATION CENTER</p><h1>審査・認証</h1><p>安全なマッチングのため、必要書類の確認状況を管理します。</p></div></section><section className="verification-overview"><span>✓</span><div><h2>アカウントは認証済みです</h2><p>必要な本人確認と事業者情報の審査が完了しています。</p></div><strong>TRUSTED</strong></section><section className="panel verification-docs"><div><span>主催者本人確認</span><small>運転免許証</small><strong>確認済み</strong></div><div><span>事業者情報</span><small>湘南イベント企画</small><strong>確認済み</strong></div><div><span>振込先口座</span><small>登録済み</small><strong>確認済み</strong></div></section></div>
}
