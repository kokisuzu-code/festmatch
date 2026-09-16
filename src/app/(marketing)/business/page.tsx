import type { Metadata } from "next"
import Link from "next/link"
import BrandMark from "@/components/BrandMark"
import BusinessBoard from "./BusinessBoard"
import "./business.css"

export const metadata: Metadata = {
  title: "イベント主催者向け運営管理",
  description: "応募受付、審査、出店者連絡、当日運営、売上報告まで。FestMatchはイベント運営をひとつの流れにまとめます。",
}

const workflow = [
  ["01", "募集", "公開ページと応募フォームを作成"],
  ["02", "受付", "応募と提出書類を自動で整理"],
  ["03", "審査", "条件を見ながら承認を判断"],
  ["04", "準備", "出店者へ必要事項をまとめて連絡"],
  ["05", "当日", "配置と対応状況を現場で共有"],
  ["06", "報告", "売上と実績を次回へ残す"],
] as const

const features = [
  { number: "01", title: "判断待ちが、すぐ分かる。", body: "応募、書類、契約の状態を一覧化。次に確認する相手だけが残ります。", data: "未対応 4件" },
  { number: "02", title: "連絡が、流れから外れない。", body: "承認結果も当日の案内も、イベントと出店者にひもづけて管理します。", data: "未返信 0件" },
  { number: "03", title: "当日の状況まで、同じ画面で。", body: "区画、到着、売上報告まで引き継ぎ、現場の確認作業を減らします。", data: "出店確定 14/20" },
] as const

function Arrow() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
}

export default function BusinessPage() {
  return <main className="fmb">
    <header className="fmb-header">
      <div className="fmb-wrap fmb-nav">
        <BrandMark href="/home" />
        <nav aria-label="主催者向けページ">
          <a href="#features">機能</a>
          <a href="#impact">導入効果</a>
          <a href="#pricing">料金</a>
        </nav>
        <div className="fmb-nav-actions">
          <Link href="/login">ログイン</Link>
          <Link className="fmb-button fmb-button-small" href="/signup?role=organizer">導入を相談する <Arrow /></Link>
        </div>
      </div>
    </header>

    <section className="fmb-hero">
      <div className="fmb-wrap fmb-hero-grid">
        <div className="fmb-hero-copy">
          <p className="fmb-kicker"><span>FOR EVENT ORGANIZERS</span> 主催者向け</p>
          <h1>応募から当日まで、<br /><em>運営を止めない。</em></h1>
          <p className="fmb-lead">募集、審査、連絡、配置、売上報告。<br />散らばる業務を、ひとつの流れにまとめます。</p>
          <div className="fmb-hero-actions">
            <Link className="fmb-button" href="/signup?role=organizer">主催者デモを始める <Arrow /></Link>
            <a className="fmb-text-link" href="#features">できることを見る <Arrow /></a>
          </div>
          <p className="fmb-note">相談・初期設定サポート付き</p>
        </div>
        <BusinessBoard />
      </div>
      <div className="fmb-wrap fmb-snapshot" aria-label="運営状況サマリー">
        <div><span>確認待ち</span><strong>4</strong><small>件</small></div>
        <div><span>出店確定</span><strong>14</strong><small>/ 20枠</small></div>
        <div><span>書類不足</span><strong>2</strong><small>件</small></div>
        <div className="is-good"><span>返信遅延</span><strong>0</strong><small>件</small></div>
      </div>
    </section>

    <section className="fmb-section fmb-features" id="features">
      <div className="fmb-wrap">
        <div className="fmb-section-head">
          <p className="fmb-kicker"><span>ONE FLOW</span> 運営の全体像</p>
          <h2>判断が必要な場所だけ、見える。</h2>
          <p>表計算、メール、チャットに分かれていた情報を、イベント単位で整理します。</p>
        </div>
        <div className="fmb-feature-grid">
          {features.map((feature) => <article key={feature.number}>
            <div><span>{feature.number}</span><strong>{feature.data}</strong></div>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="fmb-workflow">
      <div className="fmb-wrap">
        <div className="fmb-workflow-head">
          <p>1つのイベントを、最初から最後まで。</p>
          <span>EVENT OPERATION FLOW</span>
        </div>
        <ol>
          {workflow.map(([number, title, description]) => <li key={number}>
            <span>{number}</span><h3>{title}</h3><p>{description}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <section className="fmb-section fmb-impact" id="impact">
      <div className="fmb-wrap fmb-impact-grid">
        <div className="fmb-impact-copy">
          <p className="fmb-kicker"><span>LESS ADMIN</span> 導入効果</p>
          <h2>審査に使う時間を、<br />会場づくりへ。</h2>
          <p>情報を探す時間と、同じ確認の繰り返しを減らします。運営チームは、来場体験に時間を使えます。</p>
          <small>※右記は20店舗規模のイベントを想定したデモデータです。</small>
        </div>
        <div className="fmb-chart-card">
          <div className="fmb-chart-head"><span>応募1件あたりの確認時間</span><strong>-68%</strong></div>
          <div className="fmb-bar-row"><span>これまで</span><div><i style={{ width: "100%" }} /></div><b>25分</b></div>
          <div className="fmb-bar-row is-after"><span>FestMatch</span><div><i style={{ width: "32%" }} /></div><b>8分</b></div>
          <div className="fmb-chart-axis"><span>0</span><span>10</span><span>20</span><span>30分</span></div>
        </div>
        <div className="fmb-kpi-card">
          <span>運営メンバーの確認作業</span>
          <strong>17<span>分</span></strong>
          <p>応募1件あたり削減</p>
        </div>
        <div className="fmb-kpi-card is-dark">
          <span>20店舗の審査なら</span>
          <strong>5.6<span>時間</span></strong>
          <p>企画と現場準備に戻せる</p>
        </div>
      </div>
    </section>

    <section className="fmb-section fmb-pricing" id="pricing">
      <div className="fmb-wrap">
        <div className="fmb-section-head fmb-section-head-row">
          <div><p className="fmb-kicker"><span>PRICING</span> 料金</p><h2>開催スタイルで選べます。</h2></div>
          <p>単発開催から年間運営まで。必要な期間だけ、すべての運営機能を使えます。</p>
        </div>
        <div className="fmb-price-grid">
          <article>
            <div className="fmb-plan-head"><span>スポット</span><small>単発イベント向け</small></div>
            <p className="fmb-price"><strong>¥250,000</strong><span>/ イベント</span></p>
            <p>決済日から最大3か月利用可能</p>
            <ul><li>イベント公開・応募受付</li><li>審査・出店者連絡</li><li>当日運営・売上報告</li></ul>
            <Link className="fmb-outline-button" href="/signup?role=organizer">スポットで相談する <Arrow /></Link>
          </article>
          <article className="is-recommended">
            <div className="fmb-plan-head"><span>年間</span><small>継続開催・複数イベント向け</small></div>
            <p className="fmb-price"><strong>¥120,000</strong><span>/ 月</span></p>
            <p>すべてのイベントをまとめて運営</p>
            <ul><li>スポットの全機能</li><li>イベント数の制限なし</li><li>継続運営データの蓄積</li></ul>
            <Link className="fmb-button" href="/signup?role=organizer">年間プランを相談する <Arrow /></Link>
          </article>
        </div>
      </div>
    </section>

    <section className="fmb-final">
      <div className="fmb-wrap">
        <div><p>NEXT EVENT, ONE FLOW.</p><h2>次のイベント運営を、ひとつに。</h2></div>
        <Link className="fmb-button fmb-button-light" href="/signup?role=organizer">導入を相談する <Arrow /></Link>
      </div>
    </section>

    <footer className="fmb-footer"><div className="fmb-wrap"><BrandMark href="/home" /><p>イベント主催者と出店者を、運営の流れでつなぐ。</p><nav><Link href="/home">一般向けHP</Link><Link href="/festmap">イベントを探す</Link><Link href="/login">ログイン</Link></nav><small>© 2026 FestMatch</small></div></footer>
  </main>
}
