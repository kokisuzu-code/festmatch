'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Application = {
  id: string
  events: { title: string; date: string } | null
  kitchen_car_id: string
}

export default function SalesForm({
  userId,
  applications,
  defaultKitchenCarId,
}: {
  userId: string
  applications: Application[]
  defaultKitchenCarId: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [linked, setLinked] = useState<string>('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [amount, setAmount] = useState('')
  const [customers, setCustomers] = useState('')
  const [weather, setWeather] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const handleLinkedChange = (appId: string) => {
    setLinked(appId)
    if (appId) {
      const app = applications.find(a => a.id === appId)
      if (app?.events) {
        setEventName(app.events.title)
        setEventDate(app.events.date)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventName || !eventDate || !amount) {
      setError('イベント名・日付・売上金額は必須です')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const linkedApp = linked ? applications.find(a => a.id === linked) : null
    const { error: err } = await supabase.from('sales_records').insert({
      owner_id: userId,
      kitchen_car_id: linkedApp?.kitchen_car_id ?? defaultKitchenCarId,
      application_id: linked || null,
      event_name: eventName,
      event_date: eventDate,
      sales_amount: parseInt(amount.replace(/,/g, ''), 10),
      customer_count: customers ? parseInt(customers, 10) : null,
      weather: weather || null,
      notes: notes || null,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setOpen(false)
    setLinked(''); setEventName(''); setEventDate(''); setAmount(''); setCustomers(''); setWeather(''); setNotes('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        売上を記録する
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-100 text-sm">売上を記録</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 承認済みイベントと紐づけ */}
      {applications.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 mb-1 block">応募済みイベントから選択（任意）</label>
          <select
            value={linked}
            onChange={e => handleLinkedChange(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="">手動で入力する</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.events?.title} ({app.events?.date})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs text-slate-400 mb-1 block">イベント名 *</label>
        <input
          value={eventName}
          onChange={e => setEventName(e.target.value)}
          placeholder="湘南フードフェスティバル"
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          required
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">開催日 *</label>
        <input
          type="date"
          value={eventDate}
          onChange={e => setEventDate(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">売上金額（円）*</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="280000"
            min="0"
            className="w-full rounded-xl px-3 py-2.5 text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">来客数（人）</label>
          <input
            type="number"
            value={customers}
            onChange={e => setCustomers(e.target.value)}
            placeholder="120"
            min="0"
            className="w-full rounded-xl px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">天気</label>
        <select
          value={weather}
          onChange={e => setWeather(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="">未記入</option>
          <option value="sunny">☀️ 晴れ</option>
          <option value="cloudy">☁️ 曇り</option>
          <option value="rainy">🌧️ 雨</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">メモ</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="天気が良く好調でした"
          rows={2}
          className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
      >
        {saving ? '保存中…' : '保存する'}
      </button>
    </form>
  )
}
