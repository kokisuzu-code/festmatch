'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// トップページ(公開・静的/ISR)はログイン状態に関わらず同じHTMLを配信する。
// ログイン済みユーザーを/dashboardへ送る判定はここでクライアント側のみ行い、
// サーバー側でセッションを読まないことでページを静的化・キャッシュ可能にする。
export default function AuthHomeRedirect() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname === '/home') return
    let active = true
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active && data.session) router.replace('/dashboard')
      })
    return () => {
      active = false
    }
  }, [pathname, router])

  return null
}
