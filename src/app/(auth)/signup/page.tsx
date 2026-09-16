'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import { createClient } from '@/lib/supabase/client'
import { APP_URL } from '@/lib/app'
import styles from '../login/login.module.css'

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

  return (
    <AuthShell
      eyebrow="ACCOUNT SETUP"
      title="アカウントを作成"
      description="メールアドレスとパスワードを設定してください。"
      footer={<>すでに登録済みですか？ <Link href="/login">ログイン</Link></>}
    >
      <GoogleAuthButton claim={claim} role={role} label="Googleで新規登録" />
      <form className={styles.form} onSubmit={submit}>
        <label><span>メールアドレス</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label><span>パスワード</span><input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12文字以上" /></label>
        <label><span>パスワード（確認）</span><input required type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="もう一度入力" /></label>
        <p className={styles.hint}>12文字以上で設定してください。</p>
        {message && <p className={styles.message} role="status">{message}</p>}
        <button className={styles.submit} disabled={submitting} aria-busy={submitting}><span>{submitting ? '作成中…' : 'アカウントを作成'}</span>{!submitting && <span aria-hidden="true">→</span>}</button>
      </form>
    </AuthShell>
  )
}
