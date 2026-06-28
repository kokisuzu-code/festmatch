'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Space = {
  id?: string
  name: string
  fee: number
  max_count: number
  genre: string | null
  description: string | null
  sort_order: number
}

const GENRES = [
  '唐揚げ・揚げ物',
  'クレープ・スイーツ',
  'たこ焼き・お好み焼き',
  'カレー・スパイス料理',
  'タコス・タコライス',
  'やきそば・焼きうどん',
  'ラーメン・麺類',
  'バーガー・サンドイッチ',
  'BBQ・焼き肉・串焼き',
  'ピザ・パスタ',
  'アジアン・エスニック料理',
  'その他',
]

function feeToTierLabel(fee: number): string {
  if (fee >= 50000) return 'ティアS・10コスト'
  if (fee >= 30000) return 'ティアA・5コスト'
  if (fee >= 20000) return 'ティアB・3コスト'
  return 'ティアC・1コスト'
}

export default function SpaceSettings({ eventId }: { eventId: string }) {
  const supabase = createClient()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('event_spaces')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setSpaces(data)
        setLoading(false)
      })
  }, [eventId])

  function addSpace() {
    setSpaces(prev => [...prev, {
      name: `スペース${String.fromCharCode(65 + prev.length)}`,
      fee: 30000,
      max_count: 1,
      genre: null,
      description: null,
      sort_order: prev.length,
    }])
  }

  function updateSpace(i: number, key: keyof Space, value: any) {
    setSpaces(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s))
  }

  function removeSpace(i: number) {
    setSpaces(prev => prev.filter((_, idx) => idx !== i))
  }

  async function saveSpaces() {
    setSaving(true)
    setSaved(false)

    // 既存を全削除して再挿入
    await supabase.from('event_spaces').delete().eq('event_id', eventId)

    if (spaces.length > 0) {
      await supabase.from('event_spaces').insert(
        spaces.map((s, i) => ({
          event_id: eventId,
          name: s.name,
          fee: s.fee,
          max_count: s.max_count,
          genre: s.genre || null,
          description: s.description || null,
          sort_order: i,
        }))
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return null

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">区画設定</h2>
          <p className="text-xs text-gray-400 mt-0.5">区画ごとに出店料・コストを変えられます</p>
        </div>
        <button
          type="button"
          onClick={addSpace}
          className="text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
        >
          + 区画を追加
        </button>
      </div>

      {spaces.length === 0 && (
        <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
          区画を追加すると、スペースごとに出店料を設定できます。<br />
          設定しない場合はイベント全体の出店料が適用されます。
        </p>
      )}

      {spaces.map((space, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">区画名</label>
              <input
                value={space.name}
                onChange={e => updateSpace(i, 'name', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例：ステージ前エリア"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">出店料（円）</label>
              <input
                type="number"
                value={space.fee}
                onChange={e => updateSpace(i, 'fee', Number(e.target.value))}
                min={0}
                step={1000}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">最大台数</label>
              <input
                type="number"
                value={space.max_count}
                onChange={e => updateSpace(i, 'max_count', Number(e.target.value))}
                min={1}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ジャンル制限</label>
              <select
                value={space.genre ?? ''}
                onChange={e => updateSpace(i, 'genre', e.target.value || null)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">制限なし（全ジャンル可）</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">説明（任意）</label>
            <input
              value={space.description ?? ''}
              onChange={e => updateSpace(i, 'description', e.target.value || null)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="例：ステージ隣接・電源あり"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
              {feeToTierLabel(space.fee)}
            </span>
            <button
              type="button"
              onClick={() => removeSpace(i)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              削除
            </button>
          </div>
        </div>
      ))}

      {spaces.length > 0 && (
        <button
          type="button"
          onClick={saveSpaces}
          disabled={saving}
          className="w-full py-2.5 text-sm font-semibold rounded-xl bg-gray-900 text-white disabled:opacity-40 hover:bg-gray-700 transition-colors"
        >
          {saving ? '保存中...' : saved ? '保存しました' : '区画設定を保存'}
        </button>
      )}
    </section>
  )
}
