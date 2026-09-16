export const metadata = { title: 'ポリシー・補欠', description: '募集ポリシーと補欠運用を確認します。' }

export default function OrganizerPoliciesPage() {
  return <div className="dashboard-stack"><section className="dashboard-hero"><div><p className="eyebrow">POLICY & WAITLIST</p><h1>ポリシー・補欠</h1><p>キャンセル時の補欠繰り上げと募集ルールを管理します。</p></div></section><section className="policy-page-grid"><article className="panel"><div className="section-heading"><div><p className="eyebrow">CANCELLATION</p><h2>キャンセルポリシー</h2></div></div><p className="panel-copy">イベントごとの募集条件とキャンセル期限は、イベント編集画面から設定・確認できます。</p></article><article className="panel"><div className="section-heading"><div><p className="eyebrow">WAITLIST</p><h2>補欠登録</h2></div></div><p className="panel-copy">ジャンル枠が満了した場合も候補を残し、空きが出た際に確認できる運用を想定しています。</p></article></section></div>
}
