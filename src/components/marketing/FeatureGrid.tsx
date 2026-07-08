export default function FeatureGrid() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">ALL-IN-ONE</span>
          <h2 className="display">出店管理のすべてを、ひとつに。</h2>
          <p>Excelと電話とメールに分散していた仕事を、FestMatchがひとつの流れにまとめます。</p>
        </div>
        <div className="feat-grid">
          <div className="feat">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 4V3h6v2H9z" fill="currentColor" stroke="none" />
                <path d="M9 10h6M9 14h6M9 18h3" />
              </svg>
            </div>
            <h3>出店申請の管理</h3>
            <p>募集要項の掲載から申請の受付、承認・却下までブラウザだけで完結。書類のやり取りや電話確認はもう必要ありません。</p>
            <div className="kw">申請フォーム / 承認フロー / ベンダープロフィール</div>
          </div>
          <div className="feat">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
                <path d="M9 4v14M15 6v14" />
              </svg>
            </div>
            <h3>区画マップと出店料設定</h3>
            <p>会場の区画ごとに異なる出店料を設定。人気の区画・電源付き区画など、条件に応じた価格設計ができます。</p>
            <div className="kw">区画割り / ゾーン別料金 / 会場レイアウト</div>
          </div>
          <div className="feat">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18M7 15h4" />
              </svg>
            </div>
            <h3>出店料のオンライン決済</h3>
            <p>Stripeによる安全な決済で、出店料を自動回収。入金確認の手間なく、イベント準備に集中できます。</p>
            <div className="kw">自動回収 / 明細管理 / 返金対応</div>
          </div>
          <div className="feat">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <path d="M4 11v3l3 1 9 5V4L7 9l-3 2z" />
                <path d="M19 10a4 4 0 0 1 0 5" />
              </svg>
            </div>
            <h3>連絡の自動化</h3>
            <p>出店確定・前日リマインド・雨天時の連絡まで、出店者全員への一斉通知をワンクリックで。天候と連動した通知にも対応します。</p>
            <div className="kw">一斉配信 / リマインド / 天候連携</div>
          </div>
        </div>
      </div>
    </section>
  );
}
