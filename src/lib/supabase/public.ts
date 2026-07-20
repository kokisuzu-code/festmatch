import { createClient } from '@supabase/supabase-js'
import { getSupabasePublishableKey, getSupabaseUrl } from './env'

// 公開ページ(FestMap一覧・イベント詳細・ベンダー公開プロフィール等)専用の
// 匿名Supabaseクライアント。next/headers の cookies() を一切呼ばないため、
// このクライアントを使うページはリクエスト単位の動的レンダリングを強制されず、
// 静的化・ISR(revalidate)の対象にできる。
// 権限は匿名ユーザーと同じ(RLS/公開ビューの範囲内)なので、非公開データは扱えない。
export function createPublicClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
