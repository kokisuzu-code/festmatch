import Link from "next/link";

export default function MarketingHeader() {
  return (
    <header>
      <div className="container nav">
        <div className="logo">
          Fest<span className="dot">Match</span>
        </div>
        <nav className="nav-links">
          <Link href="/festmap">フェスを探す</Link>
          <a href="#host">主催者の方</a>
          <a href="#vendor">ベンダーの方</a>
          <a href="#features">機能</a>
          <a href="#pricing">料金</a>
        </nav>
        <div className="nav-cta">
          <Link className="btn btn-ghost" href="/login">
            ログイン
          </Link>
          <Link className="btn btn-primary" href="/signup?role=organizer">
            無料で始める
          </Link>
        </div>
      </div>
    </header>
  );
}
