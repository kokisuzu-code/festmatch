'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import styles from "./login.module.css"

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}

function claimToken(value: string | null) {
  return value && /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value) ? value : null
}

function LoginForm() {
  const params = useSearchParams()
  const claim = claimToken(params.get("claim"))
  const sessionExpired = params.get("reason") === "session_expired"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage("")
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setMessage("メールアドレスまたはパスワードが正しくありません。")
      return
    }
    window.location.assign(claim ? `/claim?token=${encodeURIComponent(claim)}` : "/dashboard")
  }

  const signupHref = claim ? `/signup?claim=${encodeURIComponent(claim)}` : "/signup"
  const forgotPasswordHref = claim ? `/forgot-password?claim=${encodeURIComponent(claim)}` : "/forgot-password"

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
        <div className={styles.mobileBrand}>
          <span className={styles.brandIcon}>F</span>
          <span>FestMatch</span>
        </div>

        <div className={styles.formWrap}>
          <header className={styles.heading}>
            <p>WELCOME BACK</p>
            <h2>ログイン</h2>
            <span>登録したアカウント情報を入力してください。</span>
          </header>

          {sessionExpired && <p className={styles.message} role="status">セッションの有効期限が切れました。もう一度ログインしてください。</p>}

          <form className={styles.form} onSubmit={submit}>
            <label>
              <span>メールアドレス</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <label>
              <span>パスワード</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="パスワードを入力"
              />
            </label>
            <div className={styles.passwordLink}><Link href={forgotPasswordHref}>パスワードを忘れた場合</Link></div>
            {message && <p className={styles.message} role="alert">{message}</p>}
            <button className={styles.submit} disabled={submitting}>
              <span>{submitting ? "ログイン中…" : "ログイン"}</span>
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className={styles.signup}>アカウントをお持ちでない方は <Link href={signupHref}>新規登録</Link></p>
        </div>

        <footer className={styles.legal}>© 2026 FestMatch</footer>
      </section>
    </main>
  )
}
