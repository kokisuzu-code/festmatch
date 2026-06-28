'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Space = {
  id: string
  name: string
  fee: number
  max_count: number
  approved_count: number
  genre: string | null
  description: string | null
}

function feeToTier(fee: number): { tier: string; costWeight: number } {
  if (fee >= 50000) return { tier: 'S', costWeight: 10 }
  if (fee >= 30000) return { tier: 'A', costWeight: 5 }
  if (fee >= 20000) return { tier: 'B', costWeight: 3 }
  return { tier: 'C', costWeight: 1 }
}

export default function SpaceSelector({
  eventId,
  genre,
  onSelect,
}: {
  eventId: string
  genre: string
  onSelect: (space: Space | null) => void
}) {
  const supabase = createClient()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selected, setSelected] = useState<Space | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!genre) { setLoading(false); return }
    supabase
      .from('event_spaces')
      .select('*')
      .eq('event_id', eventId)
      .or(`genre.is.null,genre.eq.${genre}`)
      .order('sort_order')
      .then(({ data }) => {
        setSpaces(data ?? [])
        setLoading(false)
      })
  }, [eventId, genre])

  if (loading || spaces.length === 0) return null

  return (
    <div className="space-y-2 mt-4">
      <p className="text-sm font-semibold text-slate-200">出店区画を選択</p>
      <p className="text-xs text-slate-500">このイベントは区画ごとに出店料が異なります</p>
      {spaces.map(space => {
        const isFull = space.approved_count >= space.max_count
        const isSelected = selected?.id === space.id
        const { tier, costWeight } = feeToTier(space.fee)
        const remaining = space.max_count - space.approved_count

        return (
          <button
            key={space.id}
            type="button"
            disabled={isFull}
            onClick={() => {
              const next = isSelected ? null : space
              setSelected(next)
              onSelect(next)
            }}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              isFull
                ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700'
                : isSelected
                ? 'border-green-500 bg-green-950/40'
                : 'border-slate-700 bg-slate-800 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-slate-100">{space.name}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isFull ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
              }`}>
                {isFull ? '満了' : `残${remaining}枠`}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>¥{space.fee.toLocaleString()}</span>
              <span>ティア{tier}・{costWeight}コスト</span>
              {space.genre && <span className="text-amber-400">{space.genre}専用</span>}
            </div>
            {space.description && (
              <p className="text-xs text-slate-500 mt-1">{space.description}</p>
            )}
          </button>
        )
      })}
      {selected && (
        <p className="text-xs text-green-400 font-medium">
          {selected.name}（¥{selected.fee.toLocaleString()}）を選択中
        </p>
      )}
    </div>
  )
}
