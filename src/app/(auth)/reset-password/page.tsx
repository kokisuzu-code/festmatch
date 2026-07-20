'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import BrandMark from "@/components/BrandMark"
import { createClient } from "@/lib/supabase/client"

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

  return <div className="auth-page"><header className="auth-header"><BrandMark /></header><section className="auth-card"><p className="eyebrow">NEW PASSWORD</p><h1>新しいパスワード</h1><p>12文字以上の新しいパスワードを設定してください。</p><form className="form-stack" onSubmit={submit}><label className="field">新しいパスワード<input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="field">パスワード（確認）<input required type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{message && <p className="form-message" role="alert">{message}</p>}<button className="button button-primary" disabled={submitting}>{submitting ? "保存中" : "パスワードを設定"}</button></form><p className="form-subtle"><Link href="/login">ログインに戻る</Link></p></section></div>
}
