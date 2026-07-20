'use client'

import { useState } from 'react'

export default function OrganizerBillingControls() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function startAnnualPlan() {
    setLoading(true)
    setMessage('')
    const response = await fetch('/api/stripe/organizer/annual', { method: 'POST' })
    const body = await response.json()
    if (response.ok && body.url) window.location.assign(body.url)
    else {
      setLoading(false)
      setMessage(body.error ?? '主催者契約を開始できませんでした。')
    }
  }

  return <div className="action-box"><div className="button-row"><button className="button button-primary" disabled={loading} onClick={startAnnualPlan}>{loading ? '準備中' : '年間契約を開始（月額 ¥120,000）'}</button></div><p>スポット契約は、イベント詳細の公開画面からイベントごとに開始できます。</p>{message && <p role="alert">{message}</p>}</div>
}
