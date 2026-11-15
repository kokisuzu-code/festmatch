import Link from "next/link"
import Image from "next/image"
import BrandMark from "@/components/BrandMark"
import styles from "./OrganizerPreview.module.css"

const events = [
  {
    title: "港のサマーマーケット", date: "2026-08-19", dateLabel: "8月19日（水）", city: "横浜市",
    photo: "/reference/waterfront-market.webp", published: true, pending: 7, openBooths: 3,
  },
  {
    title: "秋のリバーサイド市", date: "2026-09-07", dateLabel: "9月7日（月）", city: "川崎市",
    photo: "/reference/craft-workshop.webp", published: false, pending: 0, openBooths: 0,
  },
  {
    title: "海辺のフードマルシェ", date: "2026-09-20", dateLabel: "9月20日（日）", city: "藤沢市",
    photo: "/reference/summer-festival.webp", published: true, pending: 5, openBooths: 5,
  },
]

export default function OrganizerPreview() {
  const totals = [
    { label: "開催予定", count: events.length, unit: "件" },
    { label: "未確認の応募", count: events.reduce((sum, event) => sum + event.pending, 0), unit: "件" },
    { label: "空き区画", count: events.reduce((sum, event) => sum + event.openBooths, 0), unit: "区画" },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.bar}>
          <BrandMark />
          <nav aria-label="デモのナビゲーション">
            <Link href="/developer">デモ一覧</Link>
            <Link href="/festmap">FestMap</Link>
          </nav>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.intro}>
          <div>
            <h1>イベント管理</h1>
            <p>主催者デモ（サンプルデータ）</p>
          </div>
          <Link className={styles.register} href="/signup?role=organizer">主催者として登録</Link>
        </div>

        <dl className={styles.totals} aria-label="掲載イベントの集計">
          {totals.map(({ label, count, unit }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{count}<span>{unit}</span></dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="organizer-events">
          <div className={styles.sectionHeading}>
            <h2 id="organizer-events">開催イベント</h2>
            <span>2026年8月時点</span>
          </div>
          <div className={styles.columns} aria-hidden="true">
            <span>イベント名・開催日</span><span>公開状況</span><span>未確認の応募</span><span>空き区画</span>
          </div>
          <ul className={styles.events} role="list">
            {events.map((event) => (
              <li key={event.date} className={styles.event}>
                <div className={styles.identity}>
                  <Image className={styles.thumb} src={event.photo} width={72} height={54} sizes="72px" alt="" />
                  <div>
                    <h3>{event.title}</h3>
                    <p><time dateTime={event.date}>{event.dateLabel}</time><span>{event.city}</span></p>
                  </div>
                </div>
                <span className={event.published ? styles.published : styles.draft}>
                  {event.published ? "募集中" : "下書き"}
                </span>
                <dl className={styles.eventNumbers}>
                  <div><dt>未確認の応募</dt><dd>{event.published ? `${event.pending}件` : "—"}</dd></div>
                  <div><dt>空き区画</dt><dd>{event.published ? `${event.openBooths}区画` : "—"}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </section>

        <footer className={styles.footer}>
          <Link href="/developer">デモ一覧に戻る</Link>
          <Link href="/developer/vendor">出店者デモを見る</Link>
        </footer>
      </main>
    </div>
  )
}
