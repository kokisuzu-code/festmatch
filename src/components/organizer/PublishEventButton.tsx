'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PublishEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function publish() {
    setLoading(true)
    setMessage('')
    const response = await fetch(`/api/organizer/events/${eventId}/publish`, { method: 'POST' })
    const body = await response.json()
    setLoading(false)
    if (response.ok) router.refresh()
    else setMessage(body.error ?? 'イベントを公開できませんでした。')
  }

  return <div className="action-box"><button className="button button-primary" disabled={loading} onClick={publish}>{loading ? '公開中' : '募集を公開する'}</button>{message && <p role="alert">{message}</p>}</div>
}
