'use client'

import { Suspense, useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import { createInitialAccount } from './actions'
import styles from '../login/login.module.css'

const initialState: { error?: string } = {}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className={styles.loading} aria-busy="true" />}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const params = useSearchParams()
  const claim = params.get('claim') ?? ''
  const [role, setRole] = useState<'organizer' | 'vendor'>(params.get('role') === 'vendor' || claim ? 'vendor' : 'organizer')
  const [state, action, pending] = useActionState(createInitialAccount, initialState)

  return (
    <AuthShell
      eyebrow="PROFILE SETUP"
      title="プロフィールを設定"
      description="表示名と利用する立場を選択してください。"
    >
      <form action={action} className={styles.form}>
        <input type="hidden" name="claim" value={claim} />
        <label><span>表示名</span><input required name="display_name" maxLength={100} placeholder="団体名または屋号" /></label>
        <fieldset className={styles.roleField}>
          <legend>利用する立場</legend>
          <div className={styles.roleChoice}>
            <label><input type="radio" name="role" value="organizer" checked={role === 'organizer'} disabled={Boolean(claim)} onChange={() => setRole('organizer')} /><span><strong>主催者</strong><small>イベントを企画・運営する</small></span></label>
            <label><input type="radio" name="role" value="vendor" checked={role === 'vendor'} onChange={() => setRole('vendor')} /><span><strong>出店者</strong><small>イベントへ応募・出店する</small></span></label>
          </div>
          <p className={styles.hint}>登録後は利用区分を変更できません。</p>
        </fieldset>
        {state.error && <p className={styles.message} role="alert">{state.error}</p>}
        <button className={styles.submit} disabled={pending} aria-busy={pending}><span>{pending ? '保存中…' : '保存して続ける'}</span>{!pending && <span aria-hidden="true">→</span>}</button>
      </form>
    </AuthShell>
  )
}
