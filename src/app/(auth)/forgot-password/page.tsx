'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import AuthShell from "@/components/auth/AuthShell"
import { APP_URL } from "@/lib/app"
import { createClient } from "@/lib/supabase/client"
import styles from "../login/login.module.css"

export default function ForgotPasswordPage() {
  return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>
}

function claimToken(value: string | null) {
  return value && /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value) ? value : null
}

function returnPath(value: string | null) {
  return value && /^\/(?:dashboard|organizer|vendor|admin)(?:\/|\?|$)/.test(value) ? value : null
}

function ForgotPasswordForm() {
  const params = useSearchParams()
  const claim = claimToken(params.get("claim"))
  const next = returnPath(params.get("next"))
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage("")
    const recoveryQuery = new URLSearchParams({ next: "/reset-password" })
    if (claim) recoveryQuery.set("claim", claim)
    if (next) recoveryQuery.set("return_to", next)
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/callback?${recoveryQuery.toString()}`,
    })
    setSubmitting(false)
    setMessage(error ? "リンクを送信できませんでした。入力内容を確認して、もう一度お試しください。" : "登録済みの場合は、パスワード設定用のリンクを送信しました。メールをご確認ください。")
  }

  return (
    <AuthShell
      eyebrow="PASSWORD RESET"
      title="パスワードを再設定"
      description="登録済みのメールアドレスへ設定用リンクを送信します。"
      footer={<Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>ログインに戻る</Link>}
    >
      <form className={styles.form} onSubmit={submit}>
        <label><span>メールアドレス</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        {message && <p className={styles.message} role="status">{message}</p>}
        <button className={styles.submit} disabled={submitting}><span>{submitting ? "送信中…" : "設定リンクを送る"}</span>{!submitting && <span aria-hidden="true">→</span>}</button>
      </form>
    </AuthShell>
  )
}
