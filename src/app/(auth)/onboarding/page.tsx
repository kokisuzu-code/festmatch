'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import BrandMark from '@/components/BrandMark'
import { createInitialAccount } from './actions'

const initialState: { error?: string } = {}

export default function OnboardingPage() {
  const params = useSearchParams()
  const claim = params.get('claim') ?? ''
  const [role, setRole] = useState<'organizer' | 'vendor'>(params.get('role') === 'vendor' || claim ? 'vendor' : 'organizer')
  const [state, action, pending] = useActionState(createInitialAccount, initialState)

  return (
    <div className="auth-page">
      <header className="auth-header"><BrandMark /></header>
      <section className="auth-card">
        <p className="eyebrow">PROFILE SETUP</p>
        <h1>プロフィールを設定</h1>
        <p>最初に利用する立場と表示名を選択してください。登録後は利用区分を変更できません。</p>
        <form action={action} className="form-stack">
          <input type="hidden" name="claim" value={claim} />
          <label className="field">表示名<input required name="display_name" maxLength={100} placeholder="団体名または屋号" /></label>
          <fieldset className="field">
            <legend>利用する立場</legend>
            <span className="role-choice">
              <label><input type="radio" name="role" value="organizer" checked={role === 'organizer'} disabled={Boolean(claim)} onChange={() => setRole('organizer')} /><span>主催者</span></label>
              <label><input type="radio" name="role" value="vendor" checked={role === 'vendor'} onChange={() => setRole('vendor')} /><span>ベンダー</span></label>
            </span>
          </fieldset>
          {state.error && <p className="form-message" role="alert">{state.error}</p>}
          <button className="button button-primary" disabled={pending}>{pending ? '保存中' : '保存して続ける'}</button>
        </form>
      </section>
    </div>
  )
}
