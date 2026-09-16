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
        <Link className={styles.brand} href="/home" aria-label="FestMatch トップへ戻る">
          <span className={styles.brandIcon}>F</span>
          <span>FestMatch</span>
        </Link>

        <div className={styles.storyCopy}>
          <p className={styles.kicker}>FIND. APPLY. OPERATE.</p>
          <h1>イベントと出店を、<br />もっと近くに。</h1>
          <p>探す、募集する、当日を迎える。<br />主催者と出店者を、ひとつの場所でつなぎます。</p>
        </div>

        <div className={styles.storyFooter}>
          <span>01　イベントを探す</span>
          <span>02　応募・審査</span>
          <span>03　当日を進める</span>
        </div>
        <div className={styles.glow} aria-hidden="true" />
      </section>

      <section className={styles.access}>
        <div className={styles.accessTop}>
          <Link className={styles.mobileBrand} href="/home" aria-label="FestMatch トップへ戻る">
            <span className={styles.brandIcon}>F</span>
            <span>FestMatch</span>
          </Link>
          <Link className={styles.homeLink} href="/home">
            <span aria-hidden="true">←</span>
            FestMatchトップへ戻る
          </Link>
        </div>

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
