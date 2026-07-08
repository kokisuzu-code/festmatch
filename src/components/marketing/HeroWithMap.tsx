export default function HeroWithMap({ upcomingCount }: { upcomingCount: number }) {
  return (
    <section className="hero" id="map">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">FESTMATCH — 主催者自走型プラットフォーム</span>
          <h1 className="display">
            週末の<em>フェス</em>と、
            <br />
            街の<em>キッチンカー</em>を
            <br />
            ひとつの地図に。
          </h1>
          <p className="lead">
            FestMatchは、フェス・イベントの主催者とキッチンカーを直接つなぐプラットフォーム。出店募集から申請、区画割り、出店料の決済まで、すべてがこの中で完結します。
          </p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#pricing">
              無料トライアルを始める
            </a>
            <a className="btn btn-ghost" href="#vendor">
              キッチンカーとして出店する
            </a>
          </div>
          <p className="hero-note">
            <b>料金はすべて公開。</b>「要相談」はありません。担当者不要、登録すれば即日利用開始。
          </p>
        </div>

        {/* FestMap(プロトタイプはモック表示。本番の/festmapはLeaflet+OSM) */}
        <div
          className="map-panel"
          role="img"
          aria-label="開催中のフェスが提灯マーカーで表示された地図"
        >
          <svg viewBox="0 0 700 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M-20,90 C160,60 300,130 470,95 S700,140 740,110" stroke="#C9D4E2" strokeWidth="10" fill="none" />
            <path d="M120,-20 C150,160 90,300 160,560" stroke="#C9D4E2" strokeWidth="8" fill="none" />
            <path d="M-20,300 C200,270 420,340 740,290" stroke="#C9D4E2" strokeWidth="12" fill="none" />
            <path d="M430,-20 C400,180 480,360 430,560" stroke="#C9D4E2" strokeWidth="8" fill="none" />
            <path d="M-20,450 C240,430 500,480 740,440" stroke="#D4DEE9" strokeWidth="7" fill="none" />
            <path d="M560,120 q60,80 -10,200 q-50,90 40,180 L740,560 L740,60 Z" fill="#CFE3DD" />
            <circle cx="230" cy="200" r="46" fill="#DCE8D8" />
            <circle cx="90" cy="420" r="38" fill="#DCE8D8" />
          </svg>

          <div className="searchbar">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8B93AC" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input type="text" placeholder="エリア・フェス名で検索" aria-label="フェスを検索" />
            <span className="chip">今週末</span>
            <span className="chip">神奈川</span>
          </div>

          <div className="marker" style={{ top: "38%", left: "32%" }}><div className="glow"></div><div className="bulb"></div></div>
          <div className="marker" style={{ top: "55%", left: "48%" }}><div className="glow"></div><div className="bulb"></div></div>
          <div className="marker" style={{ top: "30%", left: "62%" }}><div className="glow"></div><div className="bulb"></div></div>
          <div className="marker" style={{ top: "66%", left: "70%" }}><div className="glow"></div><div className="bulb"></div></div>
          <div className="marker" style={{ top: "48%", left: "80%" }}><div className="glow"></div><div className="bulb"></div></div>
          <div className="marker" style={{ top: "72%", left: "28%" }}><div className="glow"></div><div className="bulb"></div></div>

          <div className="fest-card">
            <span className="tag">今週末開催</span>
            <h3>相模原グルメフェスタ 2026</h3>
            <p>7/4(土)–5(日) 淵野辺公園｜キッチンカー18台出店</p>
          </div>
          <div className="map-count">開催予定のフェス {upcomingCount}件</div>
        </div>
      </div>
    </section>
  );
}
