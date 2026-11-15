import Link from 'next/link'
import DemoShell from '@/components/developer/DemoShell'
import styles from './page.module.css'

export const metadata = {
  title: '開発者ページ',
  description: 'FestMatchの主催者・出店者向けの公開デモと、開発時の確認事項をまとめています。',
  robots: { index: false, follow: false },
}

const demos = [
  { href: '/developer/organizer', title: '主催者デモ', description: '開催イベント、応募の確認、出店区画の管理' },
  { href: '/developer/vendor', title: '出店者デモ', description: '出店先探し、応募状況、出店の振り返り' },
]

// This public guide links to sample screens and never reads account data.
export default function DeveloperPage() {
  return (
    <DemoShell navigation={<>
      <Link href="/">トップ</Link>
      <Link href="/festmap">FestMap</Link>
      <Link href="/login">ログイン</Link>
    </>}>
      <h1>開発者ページ</h1>
      <p className={styles.lead}>公開デモはログイン不要です。どちらもサンプルデータでご覧いただけます。</p>

      <nav className={styles.demos} aria-label="役割別の公開デモ">
        {demos.map(({ href, title, description }) => (
          <Link className={styles.demo} key={href} href={href}>
            <span className={styles.role}>{title}</span>
            <span className={styles.description}>{description}</span>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>

      <div className={styles.resources}>
        <section aria-labelledby="public-pages">
          <h2 id="public-pages">公開ページ</h2>
          <ul className={styles.links}>
            <li><Link href="/festmap">イベント一覧（FestMap）</Link></li>
            <li><Link href="/">FestMatchトップページ</Link></li>
            <li><Link href="/signup">新規登録・初期設定</Link></li>
          </ul>
        </section>

        <section aria-labelledby="developer-notes">
          <h2 id="developer-notes">開発時の確認事項</h2>
          <div className={styles.notes}>
            <details>
              <summary>現在の主な機能</summary>
              <ul>
                <li>イベント作成、応募、承認、Stripe決済</li>
                <li>FestMap、出店者の公開プロフィール、応募フォームの埋め込み</li>
                <li>ジャンル別の募集枠、区画管理、承認済みの出店者とのチャット</li>
              </ul>
            </details>
            <details>
              <summary>ログインが必要な操作</summary>
              <ul>
                <li>主催者・出店者の管理画面で実際のデータを確認する</li>
                <li>応募を承認する、区画を割り当てる、メッセージを送る</li>
                <li>売上・請求や、個人・組織のプロフィールを確認する</li>
              </ul>
            </details>
            <details>
              <summary>本番データとチャットの取り扱い</summary>
              <p>本番データを操作する際は、主催者または出店者のアカウントでログインしてください。</p>
              <p>双方向チャットは、公開前に電気通信事業法上の届出要否の確認が必要です。</p>
            </details>
          </div>
        </section>
      </div>
    </DemoShell>
  )
}
