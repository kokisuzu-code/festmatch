'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { fetchWeatherByLocation, getCurrentPosition } from '@/lib/weather'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

type WeatherState = {
  temperature: number
  weatherLabel: string
  weatherType: string
  weatherCode: number
  latitude: number
  longitude: number
} | null

function SalesRecordContent() {
  const searchParams = useSearchParams()
  const applicationId = searchParams.get('application_id') ?? ''

  const [amount, setAmount]               = useState<string>('')
  const [weather, setWeather]             = useState<WeatherState>(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)

  useEffect(() => {
    async function autoFetch() {
      try {
        const { latitude, longitude } = await getCurrentPosition()
        const result = await fetchWeatherByLocation(latitude, longitude)
        setWeather({ ...result, latitude, longitude })
      } catch (err: any) {
        if (err.code === 1) setLocationDenied(true)
      } finally {
        setLoading(false)
      }
    }
    autoFetch()
  }, [])

  function handleKey(key: string) {
    if (key === '⌫') {
      setAmount(prev => prev.slice(0, -1))
    } else if (key === '000') {
      setAmount(prev => (prev === '' ? '' : prev + '000'))
    } else {
      setAmount(prev => (prev.length >= 8 ? prev : prev + key))
    }
  }

  async function handleSave() {
    if (!amount || parseInt(amount) === 0) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!vendor) { setSaving(false); setError('ベンダー情報が見つかりません'); return }

    const { error: insertError } = await supabase.from('sales_records').insert({
      application_id: applicationId || null,
      vendor_id:      vendor.id,
      amount:         parseInt(amount),
      weather:        weather?.weatherType ?? null,
      weather_code:   weather?.weatherCode ?? null,
      temperature:    weather?.temperature ?? null,
      latitude:       weather?.latitude    ?? null,
      longitude:      weather?.longitude   ?? null,
    })

    if (insertError) {
      setError('保存に失敗しました。もう一度お試しください。')
    } else {
      window.location.href = '/vendor/schedule'
    }
    setSaving(false)
  }

  const weatherIcon: Record<string, string> = {
    sunny: 'S', cloudy: 'C', rainy: 'R', snowy: 'W',
  }
  const weatherIconLabel: Record<string, string> = {
    sunny: '晴れ', cloudy: '曇り', rainy: '雨', snowy: '雪',
  }

  return (
    <div className="min-h-screen bg-[#0F1F2E] pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-slate-100 text-[18px] font-medium mb-1">売上を記録する</h1>
        <p className="text-slate-400 text-[13px]">今日の売上金額を入力してください</p>
      </div>

      {/* 天気情報 */}
      <div className="mx-4 mb-6 bg-[#1A3347] border border-white/10 rounded-xl p-4">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-white/10 rounded-full w-10 h-10" />
            <div>
              <div className="animate-pulse bg-white/10 rounded h-3 w-24 mb-2" />
              <div className="animate-pulse bg-white/10 rounded h-3 w-16" />
            </div>
          </div>
        ) : weather ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-700 text-teal-100 flex items-center justify-center text-sm font-bold">
                {weatherIcon[weather.weatherType] ?? 'N'}
              </div>
              <div>
                <p className="text-slate-100 text-[15px] font-medium">
                  {weather.weatherLabel}　{weather.temperature}℃
                </p>
                <p className="text-slate-400 text-[12px] mt-0.5">位置情報から自動取得</p>
              </div>
            </div>
            <span className="text-teal-400 text-[11px]">自動入力済み</span>
          </div>
        ) : locationDenied ? (
          <div>
            <p className="text-slate-400 text-[13px] mb-3">天気を選択してください</p>
            <div className="flex gap-2">
              {['sunny', 'cloudy', 'rainy'].map(type => (
                <button
                  key={type}
                  className="flex-1 py-2 rounded-lg border border-white/10 text-[13px] text-slate-300 hover:bg-white/5"
                >
                  {weatherIconLabel[type]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-[13px]">天気の取得に失敗しました</p>
        )}
      </div>

      {/* 売上金額表示 */}
      <div className="text-center mb-6 px-4">
        <p className="text-slate-400 text-[13px] mb-2">本日の売上合計</p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-slate-400 text-[20px]">¥</span>
          <span className="text-slate-100 text-[48px] font-medium leading-none">
            {amount === '' ? '0' : parseInt(amount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 数字キーパッド */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map(key => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className="bg-[#1A3347] border border-white/10 rounded-xl h-14
                       text-slate-100 text-[20px] font-medium
                       active:bg-white/10 active:scale-95 transition-all"
          >
            {key}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-[13px] text-center px-4 mb-4">{error}</p>
      )}

      <div className="px-4">
        <button
          onClick={handleSave}
          disabled={!amount || saving}
          className="w-full bg-teal-600 text-white text-[15px] font-medium py-4 rounded-xl
                     disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          {saving ? '保存中...' : '記録を保存する'}
        </button>
      </div>
    </div>
  )
}

export default function SalesRecordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1F2E]" />}>
      <SalesRecordContent />
    </Suspense>
  )
}
