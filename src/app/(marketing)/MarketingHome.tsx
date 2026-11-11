import Link from 'next/link'
import Image from 'next/image'
import BrandMark from '@/components/BrandMark'
import AuthHomeRedirect from '@/components/AuthHomeRedirect'
import type { SiteContent } from '@/lib/site/content'
import type { PublicEvent } from '@/components/festmap/PublicEventCard'

const images = ['/reference/craft-workshop.webp', '/reference/summer-festival.webp', '/reference/waterfront-market.webp']
function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' }).format(new Date(value))
}

export function renderMarketingHome(content: SiteContent, events: PublicEvent[], loadFailed = false, redirectSignedIn = true) {
  const visible = events.slice(0, 6)
  return <main className="fm-home">
    {redirectSignedIn && <AuthHomeRedirect />}
    <header className="fm-home-header"><div className="fm-home-container fm-home-nav"><BrandMark /><nav aria-label="メインナビゲーション"><a href="#events">イベント</a><a href="#about">FestMatchについて</a>{content.news.length > 0 && <a href="#news">お知らせ</a>}</nav><div className="fm-home-account"><Link className="fm-home-login" href="/login">ログイン</Link><Link className="fm-home-header-cta" href="/festmap">イベントを探す <span aria-hidden="true">↗</span></Link></div></div></header>

    <section className="fm-home-hero" id="top"><div className="fm-home-hero-photo"><Image src={content.heroImage} alt={content.heroAlt} fill sizes="100vw" priority unoptimized={content.heroImage.startsWith('https:')} /><span className="fm-home-photo-caption">FESTMATCH / YOUR TOWN, YOUR WEEKEND</span></div><div className="fm-home-container fm-home-hero-inner"><div className="fm-home-hero-card"><p className="fm-home-kicker"><span /> FIND YOUR NEXT WEEKEND</p><p className="fm-home-hero-overline">{content.eyebrow}</p><h1>{content.headline}</h1><p className="fm-home-hero-lead">{content.lead}</p><form className="fm-home-search" action="/festmap"><label className="sr-only" htmlFor="home-event-search">イベント名・エリア名</label><span aria-hidden="true">⌕</span><input id="home-event-search" name="q" placeholder="イベント名・エリア名で探す" /><button type="submit">探す <span aria-hidden="true">↗</span></button></form><small>会員登録なしで検索できます</small></div></div><div className="fm-home-hero-bottom"><span>SCROLL TO EXPLORE ↓</span><span>EVENTS · COMMUNITY · LOCAL LIFE</span></div></section>

    <div className="fm-home-quick"><div className="fm-home-container fm-home-quick-grid"><Link href="/festmap"><span>01 / DISCOVER</span><strong>近くのイベントを探す</strong><i aria-hidden="true">↗</i></Link><Link href="/signup?role=organizer"><span>02 / ORGANIZE</span><strong>イベントを開催する</strong><i aria-hidden="true">↗</i></Link><Link href="/signup?role=vendor"><span>03 / JOIN</span><strong>出店先を見つける</strong><i aria-hidden="true">↗</i></Link></div></div>

    <section className="fm-home-events" id="events"><div className="fm-home-container"><div className="fm-home-section-head"><div><p className="fm-home-kicker">LOCAL DISCOVERIES <span>01</span></p><h2>これからの、<br />街の楽しみ。</h2></div><p>今度の週末は、どこへ行こう。<br />開催予定のイベントから、気になるものを見つけてください。</p></div><div className="fm-home-event-toolbar"><span>{loadFailed ? 'イベント情報を読み込めませんでした' : `${visible.length} EVENTS`}</span><Link href="/festmap">イベント一覧を見る ↗</Link></div>{visible.length ? <div className="fm-home-event-grid">{visible.map((event, index) => { const href = event.is_external && event.official_url ? event.official_url : `/festmap/events/${event.slug}`; return <article className="fm-home-event-card" key={`${event.is_external ? 'external' : 'internal'}-${event.id}`}><Link href={href} target={event.is_external ? '_blank' : undefined} rel={event.is_external ? 'nofollow noopener noreferrer' : undefined}><div className="fm-home-event-photo"><Image src={images[index % images.length]} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" /><span>写真はイメージです</span></div><div className="fm-home-event-meta"><span>{event.is_external ? '地域イベント' : '出店募集中'}</span><time>{formatDate(event.starts_at)}</time></div><h3>{event.title}</h3><p>{event.address || event.prefecture}</p><span className="fm-home-event-arrow" aria-hidden="true">↗</span></Link></article> })}</div> : <div className="fm-home-empty"><strong>{loadFailed ? 'イベント情報を読み込めませんでした' : '公開中のイベントはまだありません'}</strong><p>{loadFailed ? '時間をおいて、もう一度お試しください。' : 'イベントが公開されると、ここに掲載されます。'}</p></div>}<div className="fm-home-more"><Link href="/festmap">すべてのイベントを見る <span>↗</span></Link></div></div></section>

    <section className="fm-home-about" id="about"><div className="fm-home-about-photo"><Image src="/reference/summer-festival.webp" alt="イベントを楽しむ人々のイメージ写真" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="fm-home-about-copy"><p className="fm-home-kicker">ABOUT FESTMATCH <span>02</span></p><h2>{content.aboutTitle}</h2><p className="fm-home-about-lead">{content.aboutText}</p><div className="fm-home-about-feature"><span>01</span><div><h3>{content.featureOneTitle}</h3><p>{content.featureOneText}</p></div></div><div className="fm-home-about-feature"><span>02</span><div><h3>{content.featureTwoTitle}</h3><p>{content.featureTwoText}</p></div></div></div></section>

    {content.news.length > 0 && <section className="fm-home-news" id="news"><div className="fm-home-container"><div className="fm-home-section-head"><div><p className="fm-home-kicker">JOURNAL & NEWS <span>03</span></p><h2>街からのお知らせ。</h2></div></div><div className="fm-home-news-list">{[...content.news].sort((a,b) => b.date.localeCompare(a.date)).map((item,index) => <article key={`${item.date}-${index}`}><time>{item.date.replaceAll('-', '.')}</time><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div></div></section>}

    <section className="fm-home-end"><div className="fm-home-container"><p className="fm-home-kicker">THE NEXT STORY IS YOURS</p><h2>次の週末を、<br />近くから。</h2><p>いつもの街で、新しい出会いを。</p><Link href="/festmap">イベントを探す <span>↗</span></Link></div></section>
    <footer className="fm-home-footer"><div className="fm-home-container"><div><BrandMark /><p>街のイベントと、出会いやすく。</p></div><nav><Link href="/festmap">イベントを探す</Link><Link href="/signup?role=organizer">主催者の方</Link><Link href="/signup?role=vendor">出店者の方</Link><Link href="/login">ログイン</Link></nav><small>© 2026 FestMatch</small></div></footer>
  </main>
}

