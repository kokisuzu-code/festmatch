import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="section final-cta">
      <div className="glow-bg"></div>
      <div className="container">
        <h2 className="display">次のフェスを、灯そう。</h2>
        <p>担当者は不要。主催者もベンダーも、登録すれば今日から始められます。</p>
        <div className="hero-ctas">
          <Link className="btn btn-primary" href="/signup?role=organizer">
            無料でイベントを掲載する
          </Link>
          <Link className="btn btn-night" href="/signup?role=vendor">
            ベンダー登録(無料)
          </Link>
        </div>
      </div>
    </section>
  );
}
