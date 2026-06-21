'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TEST_ACCOUNTS = [
  {
    label: '主催者アカウント',
    description: 'フェスティバル主催者・イベント管理',
    email: 'organizer@test.com',
    password: 'testpass123',
    color: 'bg-blue-500',
    badge: '主催者',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    label: '出店者アカウント A',
    description: 'キッチンカーオーナー・山田スパイスカレー',
    email: 'vendor@test.com',
    password: 'testpass123',
    color: 'bg-green-500',
    badge: '出店者',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    label: '出店者アカウント B',
    description: 'キッチンカーオーナー・佐藤クレープ工房',
    email: 'vendor2@test.com',
    password: 'testpass123',
    color: 'bg-orange-500',
    badge: '出店者',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
]

export default function DevPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const login = async (email: string, password: string) => {
    setLoading(email)
    setError(null)
    try {
      await supabase.auth.signOut()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(`${error.message} (${email})`)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  const logout = async () => {
    setLoading('logout')
    await supabase.auth.signOut()
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-4">
          <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">Dev Only</span>
        </div>
        <h1 className="text-2xl font-bold text-white">開発者ログイン</h1>
        <p className="text-gray-400 text-sm mt-1">テストアカウントでワンクリックログイン</p>
      </div>

      {/* アカウントカード */}
      <div className="w-full max-w-sm space-y-3">
        {TEST_ACCOUNTS.map(account => (
          <button
            key={account.email}
            onClick={() => login(account.email, account.password)}
            disabled={loading !== null}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${account.color} flex items-center justify-center shrink-0`}>
                {loading === account.email ? (
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{account.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${account.badgeColor}`}>{account.badge}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{account.description}</p>
                <p className="text-xs text-gray-600 mt-0.5">{account.email}</p>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 w-full max-w-sm bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">
          <p className="text-red-400 text-xs">{error}</p>
          <p className="text-gray-500 text-xs mt-1">Supabaseにこのメールアドレスが登録されているか確認してください</p>
        </div>
      )}

      {/* ダッシュボードへ戻る + ログアウト */}
      <div className="mt-6 w-full max-w-sm space-y-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl py-2.5 text-sm text-gray-200 transition-colors"
        >
          ダッシュボードへ戻る
        </button>
        <div className="border-t border-gray-800 pt-2">
          <button
            onClick={logout}
            disabled={loading !== null}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2 disabled:opacity-50"
          >
            {loading === 'logout' ? 'ログアウト中...' : 'ログアウト'}
          </button>
        </div>
      </div>

      {/* フッター */}
      <p className="mt-8 text-xs text-gray-700">
        このページはproduction環境では非表示にしてください
      </p>
    </div>
  )
}
