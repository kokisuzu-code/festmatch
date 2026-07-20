'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import BrandMark from "@/components/BrandMark"
import { APP_URL } from "@/lib/app"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>
}

function claimToken(value: string | null) {
  return value && /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value) ? value : null
}

function ForgotPasswordForm() {
  const params = useSearchParams()
  const claim = claimToken(params.get("claim"))
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage("")
    const recoveryQuery = new URLSearchParams({ next: "/reset-password" })
    if (claim) recoveryQuery.set("claim", claim)
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/callback?${recoveryQuery.toString()}`,
    })
    setSubmitting(false)
    setMessage(error ? "リンクを送信できませんでした。入力内容を確認して、もう一度お試しください。" : "登録済みの場合は、パスワード設定用のリンクを送信しました。メールをご確認ください。")
  }

  return <div className="auth-page"><header className="auth-header"><BrandMark /></header><section className="auth-card"><p className="eyebrow">PASSWORD RESET</p><h1>パスワードを設定</h1><p>登録済みのメールアドレスへ、パスワード設定用リンクを送信します。</p><form className="form-stack" onSubmit={submit}><label className="field">メールアドレス<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>{message && <p className="form-message" role="status">{message}</p>}<button className="button button-primary" disabled={submitting}>{submitting ? "送信中" : "設定リンクを送る"}</button></form><p className="form-subtle"><Link href="/login">ログインに戻る</Link></p></section></div>
}
