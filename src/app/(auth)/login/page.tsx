'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import AuthShell from "@/components/auth/AuthShell"
import GoogleAuthButton from "@/components/auth/GoogleAuthButton"
import { createClient } from "@/lib/supabase/client"
import styles from "./login.module.css"

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}

function claimToken(value: string | null) {
  return value && /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value) ? value : null
}

function returnPath(value: string | null) {
  return value && /^\/(?:dashboard|organizer|vendor|admin)(?:\/|\?|$)/.test(value) ? value : null
}

function LoginForm() {
  const params = useSearchParams()
  const claim = claimToken(params.get("claim"))
  const next = returnPath(params.get("next"))
  const sessionExpired = params.get("reason") === "session_expired"
  const authFailed = params.has("error")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    window.location.assign(claim ? `/claim?token=${encodeURIComponent(claim)}` : next ?? "/dashboard")
  }

  const signupQuery = new URLSearchParams()
  const forgotPasswordQuery = new URLSearchParams()
  if (claim) {
    signupQuery.set("claim", claim)
    forgotPasswordQuery.set("claim", claim)
  }
  if (next) {
    signupQuery.set("next", next)
    forgotPasswordQuery.set("next", next)
  }
  const signupHref = `/signup${signupQuery.size ? `?${signupQuery.toString()}` : ""}`
  const forgotPasswordHref = `/forgot-password${forgotPasswordQuery.size ? `?${forgotPasswordQuery.toString()}` : ""}`

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="ログイン"
      description="主催者・出店者共通のログイン画面です。"
      footer={<>アカウントをお持ちでない方は <Link href={signupHref}>新規登録</Link></>}
    >
      {sessionExpired && <p className={styles.message} role="status">セッションの有効期限が切れました。もう一度ログインしてください。</p>}
      {authFailed && <p className={styles.message} role="alert">ログインを完了できませんでした。もう一度お試しください。</p>}
      <GoogleAuthButton claim={claim} next={next} label="Googleでログイン" />
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
            <div className={styles.field}>
              <label htmlFor="login-password">パスワード</label>
              <div className={styles.passwordField}>
                <input
                  id="login-password"
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="パスワードを入力"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "隠す" : "表示"}
                </button>
              </div>
            </div>
            <div className={styles.passwordLink}><Link href={forgotPasswordHref}>パスワードを忘れた場合</Link></div>
            {message && <p className={styles.message} role="alert">{message}</p>}
            <button className={styles.submit} disabled={submitting}>
              <span>{submitting ? "ログイン中…" : "ログイン"}</span>
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
      </form>
      <p className={styles.destinationNote}>ログイン後は、登録済みの役割に応じた画面へ移動します。</p>
    </AuthShell>
  )
}
