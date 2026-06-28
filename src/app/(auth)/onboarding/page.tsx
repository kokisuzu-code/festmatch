'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'organizer' | 'kitchen_car_owner'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      role,
      name,
      email: user.email,
    })

    if (profileError) {
      setError('プロフィールの作成に失敗しました')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-400">FestMatch</h1>
          <p className="text-slate-400 text-sm mt-1">ようこそ！まず役割を教えてください</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300 mb-4">あなたの役割を選んでください</p>

            <button
              onClick={() => { setRole('organizer'); setStep(2) }}
              className="w-full border-2 border-slate-700 hover:border-green-300 rounded-xl p-5 text-left transition-all"
            >
              <div className="font-semibold text-slate-100">フェス主催者</div>
              <div className="text-sm text-slate-400 mt-1">
                イベントを開催してキッチンカーを募集する
              </div>
            </button>

            <button
              onClick={() => { setRole('kitchen_car_owner'); setStep(2) }}
              className="w-full border-2 border-slate-700 hover:border-green-300 rounded-xl p-5 text-left transition-all"
            >
              <div className="font-semibold text-slate-100">キッチンカーオーナー</div>
              <div className="text-sm text-slate-400 mt-1">
                フェスに出店申請をする
              </div>
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-slate-400 hover:text-slate-200 mb-2 flex items-center gap-1"
            >
              ← 戻る
            </button>

            <div className="bg-green-950/40 rounded-lg px-4 py-2 text-sm text-green-400 font-medium mb-4">
              {role === 'organizer' ? 'フェス主催者として登録' : 'キッチンカーオーナーとして登録'}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                お名前 / 屋号
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-slate-700 text-slate-100"
                placeholder="山田 太郎"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? '設定中...' : 'はじめる'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
