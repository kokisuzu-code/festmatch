'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import BrandMark from "@/components/BrandMark"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}

function claimToken(value: string | null) {
  return value && /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value) ? value : null
}

function LoginForm() {
  const params = useSearchParams()
  const claim = claimToken(params.get("claim"))
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

  return <div className="auth-page"><header className="auth-header"><BrandMark /></header><section className="auth-card"><p className="eyebrow">WELCOME BACK</p><h1>ログイン</h1><p>メールアドレスとパスワードでログインします。</p><form className="form-stack" onSubmit={submit}><label className="field">メールアドレス<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><label className="field">パスワード<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="パスワードを入力" /></label>{message && <p className="form-message" role="alert">{message}</p>}<button className="button button-primary" disabled={submitting}>{submitting ? "ログイン中" : "ログイン"}</button></form><p className="form-subtle"><Link href={forgotPasswordHref}>パスワードを忘れた場合</Link></p><p className="form-subtle">初めてですか？ <Link href={signupHref}>アカウントを作成</Link></p></section></div>
}
