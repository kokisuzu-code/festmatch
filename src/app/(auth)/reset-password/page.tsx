'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import AuthShell from "@/components/auth/AuthShell"
import { createClient } from "@/lib/supabase/client"
import styles from "../login/login.module.css"

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>
}

function claimToken(value: string | null) {
  return value && /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value) ? value : null
}

function ResetPasswordForm() {
  const params = useSearchParams()
  const claim = claimToken(params.get("claim"))
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) {
      setMessage("パスワードは12文字以上で設定してください。")
      return
    }
    if (password !== confirmation) {
      setMessage("確認用パスワードが一致しません。")
      return
    }
    setSubmitting(true)
    setMessage("")
    const { error } = await createClient().auth.updateUser({ password })
    setSubmitting(false)
    if (error) {
      setMessage("パスワードを設定できませんでした。メール内のリンクを開き直して、もう一度お試しください。")
      return
    }
    window.location.assign(claim ? `/claim?token=${encodeURIComponent(claim)}` : "/dashboard")
  }

  return (
    <AuthShell
      eyebrow="NEW PASSWORD"
      title="新しいパスワード"
      description="12文字以上の新しいパスワードを設定してください。"
      footer={<Link href="/login">ログインに戻る</Link>}
    >
      <form className={styles.form} onSubmit={submit}>
        <label><span>新しいパスワード</span><input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12文字以上" /></label>
        <label><span>パスワード（確認）</span><input required type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="もう一度入力" /></label>
        {message && <p className={styles.message} role="alert">{message}</p>}
        <button className={styles.submit} disabled={submitting}><span>{submitting ? "保存中…" : "パスワードを設定"}</span>{!submitting && <span aria-hidden="true">→</span>}</button>
      </form>
    </AuthShell>
  )
}
