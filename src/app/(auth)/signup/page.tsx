'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import BrandMark from '@/components/BrandMark'
import { createClient } from '@/lib/supabase/client'
import { APP_URL } from '@/lib/app'

export default function SignupPage() {
  return <Suspense fallback={null}><SignupForm /></Suspense>
}

function SignupForm() {
  const params = useSearchParams()
  const claim = params.get('claim')
  const role = claim || params.get('role') === 'vendor' ? 'vendor' : 'organizer'
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) {
      setMessage('パスワードは12文字以上で設定してください。')
      return
    }
    if (password !== confirmation) {
      setMessage('確認用パスワードが一致しません。')
      return
    }
    setSubmitting(true)
    setMessage('')
    const query = new URLSearchParams({ role })
    if (claim) query.set('claim', claim)
    const callbackUrl = `${APP_URL}/auth/callback?${query.toString()}`
    const { data, error } = await createClient().auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl } })
    setSubmitting(false)
    if (error) {
      setMessage('アカウントを作成できませんでした。入力内容を確認して、もう一度お試しください。')
      return
    }
    if (data.session) {
      window.location.assign(`/onboarding?${query.toString()}`)
      return
    }
    setMessage('確認メールを送信しました。メール内のリンクを開いて登録を完了してください。')
  }

  return <div className="auth-page"><header className="auth-header"><BrandMark /></header><section className="auth-card"><p className="eyebrow">ACCOUNT SETUP</p><h1>FestMatch を始める</h1><p>メールアドレスとパスワードを設定します。確認メールを開くと、表示名と利用区分の設定へ進みます。</p><form className="form-stack" onSubmit={submit}><label className="field">メールアドレス<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><label className="field">パスワード<input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12文字以上" /></label><label className="field">パスワード（確認）<input required type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="もう一度入力" /></label>{message && <p className="form-message" role="status">{message}</p>}<button className="button button-primary" disabled={submitting}>{submitting ? '作成中' : 'アカウントを作成'}</button></form><p className="form-subtle">すでに登録済みですか？ <Link href="/login">ログイン</Link></p></section></div>
}
