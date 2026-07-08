import Link from "next/link";

export default function PricingSection() {
  return (
    <section className="section pricing" id="pricing">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">PRICING</span>
          <h2 className="display">料金は、すべて公開。</h2>
          <p>「詳細はお問い合わせください」はありません。今日契約して、今日から使えます。</p>
        </div>

        <h3 className="display" style={{ textAlign: "center", fontSize: 20, marginBottom: 12 }}>
          主催者向けプラン
        </h3>
        <div className="price-note">
          <span className="banner">
            まずは <b>無料トライアル</b> で全機能をお試しいただけます
          </span>
        </div>
        <div className="plans" style={{ gridTemplateColumns: "repeat(2,1fr)", maxWidth: 760, margin: "0 auto 64px" }}>
          <div className="plan popular">
            <div className="pop-badge">おすすめ</div>
            <h3>年間契約</h3>
            <div className="price">
              ¥120,000<small>/月</small>
            </div>
            <p className="per-cost">年間を通じて複数イベントを開催する方に</p>
            <div className="best-for">
              <span>自治体</span>
              <span>商店街</span>
              <span>イベント会社</span>
            </div>
            <ul>
              <li>イベント掲載数 無制限</li>
              <li>ジャンル枠設定・偏り自動防止</li>
              <li>ワンクリック承認・断り文自動送信</li>
              <li>補欠自動繰り上げ・キャンセルポリシー適用</li>
              <li>出店料のオンライン自動回収</li>
              <li>アプリ内チャット・一斉連絡</li>
            </ul>
            <Link className="btn btn-primary" href="/signup?role=organizer">
              年間契約で始める
            </Link>
          </div>
          <div className="plan">
            <h3>スポット</h3>
            <div className="price">
              ¥250,000<small>/イベント</small>
            </div>
            <p className="per-cost">1イベント限定・利用期間は最長3ヶ月</p>
            <div className="best-for">
              <span>単発フェス</span>
              <span>学園祭</span>
              <span>お試し利用</span>
            </div>
            <ul>
              <li>1イベント分のフル機能利用</li>
              <li>準備期間を含め最長3ヶ月間利用可能</li>
              <li>年間契約と同じすべての機能</li>
              <li>年間契約への切替はいつでも可能</li>
            </ul>
            <Link className="btn btn-ghost" href="/signup?role=organizer">
              スポットで始める
            </Link>
          </div>
        </div>

        <h3 className="display" style={{ textAlign: "center", fontSize: 20, marginBottom: 8 }}>
          ベンダー向けプラン
        </h3>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", marginBottom: 24 }}>
          ベンダー登録は無料。プランは出店コストがお得になる仕組みです。
        </p>
        <div className="plans">
          <div className="plan">
            <h3>ライト</h3>
            <div className="price">
              ¥30,000<small>/月</small>
            </div>
            <p className="per-cost">10コスト｜1コストあたり ¥3,000</p>
            <div className="best-for">
              <span>週末出店</span>
              <span>個人オーナー</span>
              <span>はじめての方</span>
            </div>
            <ul>
              <li>月10コストまで利用可能</li>
              <li>未使用コストは3ヶ月繰越</li>
              <li>すべての機能を利用可能</li>
              <li>メールサポート</li>
            </ul>
            <Link className="btn btn-ghost" href="/signup?role=vendor">
              このプランで始める
            </Link>
          </div>
          <div className="plan popular">
            <div className="pop-badge">人気No.1</div>
            <h3>スタンダード</h3>
            <div className="price">
              ¥80,000<small>/月</small>
            </div>
            <p className="per-cost">30コスト｜1コストあたり ¥2,667</p>
            <div className="best-for">
              <span>月10回以上出店</span>
              <span>本業オーナー</span>
            </div>
            <ul>
              <li>月30コストまで利用可能</li>
              <li>未使用コストは3ヶ月繰越</li>
              <li>すべての機能を利用可能</li>
              <li>優先サポート</li>
            </ul>
            <Link className="btn btn-primary" href="/signup?role=vendor">
              このプランで始める
            </Link>
          </div>
          <div className="plan">
            <h3>プロ</h3>
            <div className="price">
              ¥150,000<small>/月</small>
            </div>
            <p className="per-cost">コスト無制限｜出店するほどお得</p>
            <div className="best-for">
              <span>複数台運営</span>
              <span>法人</span>
            </div>
            <ul>
              <li>コスト無制限で使い放題</li>
              <li>複数台・複数スタッフでの運用</li>
              <li>すべての機能を利用可能</li>
              <li>専任優先サポート</li>
            </ul>
            <Link className="btn btn-ghost" href="/signup?role=vendor">
              このプランで始める
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
