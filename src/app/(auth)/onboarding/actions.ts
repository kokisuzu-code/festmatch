'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type OnboardingState = { error?: string }

function isRole(value: string): value is 'organizer' | 'vendor' {
  return value === 'organizer' || value === 'vendor'
}

function validClaim(value: string) {
  return /^(?:[A-Za-z0-9_-]{43}|[a-f0-9-]{36})$/i.test(value)
}

export async function createInitialAccount(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const displayName = String(formData.get('display_name') ?? '').trim()
  const roleValue = String(formData.get('role') ?? '')
  const claim = String(formData.get('claim') ?? '')

  if (!isRole(roleValue)) return { error: '利用する立場を選択してください。' }
  if (displayName.length < 1 || displayName.length > 100) return { error: '表示名は 1〜100 文字で入力してください。' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    const admin = createAdminClient()
    const { data: existing, error: profileLookupError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileLookupError) return { error: 'アカウント情報を確認できませんでした。もう一度お試しください。' }
    if (existing && existing.role !== roleValue) return { error: 'このアカウントは別の利用区分で登録済みです。' }

    if (!existing) {
      const { error } = await admin.from('profiles').insert({
        id: user.id,
        role: roleValue,
        display_name: displayName,
      })
      if (error) return { error: 'アカウントの作成を完了できませんでした。もう一度お試しください。' }
    }

    if (roleValue === 'organizer') {
      const { error } = await admin
        .from('organizers')
        .upsert({ profile_id: user.id, organization_name: displayName, billing_plan: null }, { onConflict: 'profile_id' })
      if (error) return { error: '主催者プロフィールを作成できませんでした。もう一度お試しください。' }
    } else {
      const { error } = await admin
        .from('vendors')
        .upsert({
          profile_id: user.id,
          name: displayName,
          genre: 'その他',
          slug: `${user.id.slice(0, 8)}-vendor`,
        }, { onConflict: 'profile_id' })
      if (error) return { error: 'ベンダープロフィールを作成できませんでした。もう一度お試しください。' }
    }
  } catch {
    return { error: '初期設定に必要なサーバー設定を確認してください。' }
  }

  redirect(validClaim(claim) ? `/claim?token=${encodeURIComponent(claim)}` : `/${roleValue}`)
}
