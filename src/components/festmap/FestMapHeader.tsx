import Link from "next/link";

export default function FestMapHeader({ initialQuery }: { initialQuery?: string }) {
  return (
    <header>
      <div className="hwrap">
        <Link className="logo" href="/festmap">
          Fest<span className="dot">Map</span>
          <small>フェスマップ</small>
        </Link>
        <form className="hsearch" action="/festmap" method="get">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8B93AC" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={initialQuery}
            placeholder="エリア・イベント名・ジャンルで検索"
            aria-label="フェスを検索"
          />
        </form>
        <nav className="hlinks">
          <Link href="/festmap?date=weekend">今週末のフェス</Link>
          <Link href="/festmap">エリア一覧</Link>
          <Link className="biz" href="/#pricing">
            主催者・出店者の方は <b>FestMatch →</b>
          </Link>
        </nav>
      </div>
    </header>
  );
}
