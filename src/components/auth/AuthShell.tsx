import Link from 'next/link'
import styles from '@/app/(auth)/login/login.module.css'

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className={styles.page}>
      <section className={styles.story} aria-label="FestMatchの紹介">
        <Link className={styles.brand} href="/" aria-label="FestMatch ホーム">
          <span className={styles.brandIcon}>F</span>
          <span>FestMatch</span>
        </Link>

        <div className={styles.storyCopy}>
          <p className={styles.kicker}>EVENT OPERATIONS, SIMPLIFIED.</p>
          <h1>イベント運営を、<br />ひとつの場所で。</h1>
          <p>募集・応募・出店管理まで。<br />現場の判断が、もっと速くなる。</p>
        </div>

        <div className={styles.storyFooter}>
          <span>01　募集をつくる</span>
          <span>02　応募を選ぶ</span>
          <span>03　当日を動かす</span>
        </div>
        <div className={styles.glow} aria-hidden="true" />
      </section>

      <section className={styles.access}>
        <Link className={styles.mobileBrand} href="/" aria-label="FestMatch ホーム">
          <span className={styles.brandIcon}>F</span>
          <span>FestMatch</span>
        </Link>

        <div className={styles.formWrap}>
          <header className={styles.heading}>
            <p>{eyebrow}</p>
            <h2>{title}</h2>
            <span>{description}</span>
          </header>
          {children}
          {footer && <div className={styles.footerLink}>{footer}</div>}
        </div>

        <footer className={styles.legal}>© 2026 FestMatch</footer>
      </section>
    </main>
  )
}
