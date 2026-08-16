import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import BrandMark from "@/components/BrandMark"
import AuthHomeRedirect from "@/components/AuthHomeRedirect"
import { createPublicClient } from "@/lib/supabase/public"
import { listFestMapEvents } from "@/lib/festmap"
import type { PublicEvent } from "@/components/festmap/PublicEventCard"

// 公開トップページ: セッションを読まないため静的化しISRで配信する。
// ログイン済みユーザーの/dashboardへの遷移はAuthHomeRedirect(クライアント側)で行う。
export const revalidate = 60

export const metadata: Metadata = {
  title: "FestMatch | 近くのイベントを、もっと見つけやすく",
  description: "FestMatchは、近くのイベントを探す人、イベントを運営する主催者、出店者をつなぐプラットフォームです。",
  openGraph: { title: "FestMatch | 近くのイベントを、もっと見つけやすく", description: "イベントを探す入口から、募集・応募・管理までをひとつに。", url: "https://festmatch-pink.vercel.app", siteName: "FestMatch", locale: "ja_JP", type: "website" },
}

const demoEvents = [
  { title: "みなと朝市", date: "7月18日(土)・9:00〜14:00", place: "みなとみらい 臨港パーク", category: "グルメ", note: "キッチンカー", href: "/festmap" },
  { title: "夏のまちフェス", date: "7月19日(日)・15:00〜20:30", place: "関内・馬車道エリア", category: "音楽", note: "屋台・ライブ", href: "/festmap" },
  { title: "親子クラフト市", date: "7月20日(月祝)・10:00〜16:00", place: "横浜市役所アトリウム", category: "親子", note: "ワークショップ", href: "/festmap" },
] as const

const homeImages = [
  "/reference/waterfront-market.webp",
  "/reference/summer-festival.webp",
  "/reference/craft-workshop.webp",
] as const

function formatHomeDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(new Date(value))
}

function eventDetail(event: PublicEvent, index: number) {
  return {
    title: event.title,
    date: formatHomeDate(event.starts_at),
    place: event.address ?? event.prefecture,
    category: event.is_external ? "地域イベント" : "出店募集中",
    note: event.is_external ? "公式情報を確認" : "出店募集あり",
    href: event.is_external && event.official_url ? event.official_url : `/festmap/events/${event.slug}`,
    external: Boolean(event.is_external && event.official_url),
    image: homeImages[index % homeImages.length],
  }
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></svg>
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.3 10.2c0 5.3-7.3 10.3-7.3 10.3s-7.3-5-7.3-10.3a7.3 7.3 0 1 1 14.6 0Z" /><circle cx="12" cy="10.2" r="2.3" /></svg>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.1 4.1" /></svg>
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
}

export default async function MarketingPage() {
  const publicEvents = await (async () => {
    try {
      return await listFestMapEvents(createPublicClient())
    } catch {
      return [] as PublicEvent[]
    }
  })()
  const visibleEvents = publicEvents.slice(0, 6).map(eventDetail)
  const cards = visibleEvents.length ? visibleEvents : demoEvents.map((event, index) => ({ ...event, image: homeImages[index], external: false }))

  return <main className="fm-home">
    <AuthHomeRedirect />
    <header className="fm-home-header">
      <div className="fm-home-wrap fm-home-nav">
        <BrandMark />
        <nav aria-label="メインナビゲーション">
          <Link href="/festmap">イベントを探す</Link>
          <a href="#organizers">主催者の方</a>
          <a href="#vendors">出店者の方</a>
        </nav>
        <Link className="fm-home-publish" href="/signup?role=organizer"><span aria-hidden="true">⌁</span>イベントを掲載する</Link>
      </div>
    </header>

    <section className="fm-home-hero" id="top">
      <div className="fm-home-wrap fm-home-hero-grid">
        <div className="fm-home-hero-copy">
          <p className="fm-home-overline">近くのイベントが、ここで見つかる。</p>
          <h1>今週末、<br /><span>どこ行こう。</span></h1>
          <p className="fm-home-lead">予定のない週末が、楽しみに変わる。<br />場所と日付から、近くのイベントをすぐに探せます。</p>
          <form className="fm-home-search" action="/festmap">
            <label htmlFor="home-event-search"><PinIcon /><span className="sr-only">駅名またはエリア名</span></label>
            <input id="home-event-search" name="q" placeholder="駅名・エリア名で探す" />
            <button type="submit"><SearchIcon />イベントを探す <ArrowIcon /></button>
          </form>
          <p className="fm-home-search-note">登録なしですぐに検索できます</p>
          <div className="fm-home-hero-links">
            <Link href="/signup?role=organizer">イベントを掲載する <ArrowIcon /></Link>
            <Link href="/signup?role=vendor">出店先を探す <ArrowIcon /></Link>
          </div>
        </div>
        <div className="fm-home-hero-visual" aria-label="近くで開催されるイベント">
          <article className="fm-home-feature fm-home-feature-main">
            <Image src={homeImages[0]} alt="港沿いで開かれる朝市の様子" width={700} height={520} priority />
            <div><span>今週末</span><h2>みなと朝市</h2><p>7/18(土)・みなとみらい</p></div>
          </article>
          <article className="fm-home-feature fm-home-feature-mini">
            <Image src={homeImages[1]} alt="夏のまちフェスの様子" width={420} height={300} />
            <div><span>音楽</span><h2>夏のまちフェス</h2></div>
          </article>
          <div className="fm-home-feature-count"><strong>4</strong><span>近くで開催</span></div>
        </div>
      </div>
    </section>

    <section className="fm-home-events" id="events">
      <div className="fm-home-wrap">
        <div className="fm-home-section-heading"><p>NEAR YOU</p><h2>近くで、今週末に見つかること。</h2><span>{visibleEvents.length ? `${visibleEvents.length}件を表示中` : "掲載イメージ"}</span></div>
        <p className="fm-home-section-lead">気分や予定に合わせて、近くのイベントを絞り込めます。</p>
        <div className="fm-home-filter-row" aria-label="イベントカテゴリー"><span aria-hidden="true">☷</span>{["すべて", "グルメ", "親子", "音楽", "カルチャー", "体験"].map((label, index) => <Link key={label} className={index === 0 ? "is-active" : ""} href="/festmap">{label}</Link>)}<Link className="fm-home-map-toggle" href="/festmap" aria-label="地図でイベントを探す">⌖</Link></div>
        <div className="fm-home-event-grid">
          {cards.map((event, index) => <article className="fm-home-event-card" key={`${event.title}-${index}`}>
            <Image src={event.image} alt="" width={700} height={438} />
            <Link href={event.href} target={event.external ? "_blank" : undefined} rel={event.external ? "noopener noreferrer" : undefined} className="fm-home-event-card-body">
              <div className="fm-home-event-card-top"><span>{event.category}</span><small>{event.external ? "公式情報" : "イベント情報"}</small></div>
              <h3>{event.title}</h3>
              <p><CalendarIcon />{event.date}</p>
              <p><PinIcon />{event.place}</p>
              <div className="fm-home-event-tags"><span>{event.note}</span><span>イベント</span></div>
            </Link>
          </article>)}
        </div>
        <div className="fm-home-events-more"><Link href="/festmap">すべてのイベントを探す <ArrowIcon /></Link></div>
      </div>
    </section>

    <section className="fm-home-why">
      <div className="fm-home-wrap fm-home-why-grid">
        <div><p>WHY FESTMATCH</p><h2>SNSを探し回らなくても、街の予定がわかる。</h2><span>主催者の投稿、出店者の告知、地域のイベント情報。散らばっていた情報を、場所と日付でひとつに整理します。</span></div>
        <div className="fm-home-reason-list"><article><b>01</b><h3>近い順に見つかる</h3><p>現在地や駅名から、今日行けるイベントをすぐに探せます。</p></article><article><b>02</b><h3>必要な情報だけ見やすく</h3><p>開催日時、場所、料金、出店内容をひとつの画面に整理。</p></article><article><b>03</b><h3>気になる予定を保存</h3><p>家族や友人と共有して、週末の予定を決めやすくします。</p></article></div>
      </div>
    </section>

    <section className="fm-home-paths">
      <div className="fm-home-wrap"><p>FOR ORGANIZERS &amp; VENDORS</p><h2>人が集まる。その先の運営まで。</h2><span>利用者に見つけてもらう入口から、募集・応募・管理までFestMatchでつながります。</span><div className="fm-home-path-grid"><article id="organizers"><div className="fm-home-path-icon">⌁</div><p>イベント主催者の方へ</p><h3>掲載から出店者管理まで、ひとつの場所で。</h3><ul><li>イベントページの作成・公開</li><li>応募者の確認・承認</li><li>区画ごとの出店料設定</li><li>お知らせの一斉配信</li></ul><Link href="/signup?role=organizer">イベント掲載をはじめる <ArrowIcon /></Link></article><article id="vendors"><div className="fm-home-path-icon">▣</div><p>キッチンカー・出店者の方へ</p><h3>自分に合う出店先を、迷わず選べる。</h3><ul><li>条件に合うイベント検索</li><li>応募・スケジュール管理</li><li>営業許可書などの書類管理</li><li>売上記録と振り返り</li></ul><Link href="/signup?role=vendor">出店先を探してみる <ArrowIcon /></Link></article></div></div>
    </section>

    <section className="fm-home-final"><div className="fm-home-wrap"><p>次の週末を、近くから。</p><h2>まずは街のイベントを探してみよう。</h2><form action="/festmap"><label htmlFor="home-event-search-bottom">駅名・エリア名</label><div><input id="home-event-search-bottom" name="q" placeholder="駅名・エリア名を入力" /><button type="submit">イベントを探す <ArrowIcon /></button></div></form></div></section>

    <footer className="fm-home-footer"><div className="fm-home-wrap"><div><BrandMark /><p>近くのイベントと、出会いやすく。</p></div><nav><Link href="/festmap">イベントを探す</Link><a href="#organizers">主催者の方</a><a href="#vendors">出店者の方</a></nav><small>© 2026 FestMatch</small></div></footer>
  </main>
}
