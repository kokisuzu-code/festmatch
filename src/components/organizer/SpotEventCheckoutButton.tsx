'use client'

import { useState } from 'react'

export default function SpotEventCheckoutButton({ eventId }: { eventId: string }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function beginCheckout() {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/stripe/organizer/spot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      const body = await response.json() as { url?: string; error?: string }
      if (response.ok && body.url) {
        window.location.assign(body.url)
        return
      }
      setMessage(body.error ?? 'スポット契約を開始できませんでした。')
    } catch {
      setMessage('スポット契約を開始できませんでした。通信状態を確認してもう一度お試しください。')
    }
    setLoading(false)
  }

  return <div className="action-box">
    <button className="button button-primary" disabled={loading} aria-busy={loading} onClick={beginCheckout}>
      {loading ? '決済ページを準備中…' : 'スポット契約で公開する（¥250,000・一括）'}
    </button>
    <p>このイベントだけを公開できます。利用期間は決済日から最大3か月です。</p>
    {message && <p role="alert">{message}</p>}
  </div>
}
