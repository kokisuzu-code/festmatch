'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// トップページ(公開・静的/ISR)はログイン状態に関わらず同じHTMLを配信する。
// ログイン済みユーザーを/dashboardへ送る判定はここでクライアント側のみ行い、
// サーバー側でセッションを読まないことでページを静的化・キャッシュ可能にする。
export default function AuthHomeRedirect() {
  const router = useRouter()

  useEffect(() => {
    let active = true
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active && data.session) router.replace('/dashboard')
      })
    return () => {
      active = false
    }
  }, [router])

  return null
}
