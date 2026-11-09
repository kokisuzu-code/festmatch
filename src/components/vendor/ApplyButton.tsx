'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ApplyButton({ eventId, closed, disabledReason }: { eventId: string; closed: boolean; disabledReason?: string }) {
  const [message, setMessage] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [result, setResult] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  async function apply() {
    if (!accepted || sending) return
    setSending(true); setResult('')
    try {
      const response = await fetch('/api/applications', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({event_id:eventId,message}) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || '応募できませんでした。')
      setSent(true); setResult('応募を送信しました。主催者からの連絡をお待ちください。')
    } catch(error) { setResult(error instanceof Error ? error.message : '通信できませんでした。もう一度お試しください。') }
    finally { setSending(false) }
  }
  if (closed) return <span className="status">応募受付終了</span>
  if (disabledReason) return <span className="status slot-full-status">{disabledReason}</span>
  if (sent) return <div role="status"><p>{result}</p><Link href="/vendor/applications">応募状況を見る →</Link></div>
  return <div className="apply-box"><label>主催者へのメッセージ（任意）<textarea maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} rows={4} /></label><label className="checkbox-field"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />募集内容・出店料・キャンセル条件を確認しました</label><button type="button" className="button button-primary" disabled={sending || !accepted} aria-busy={sending} onClick={apply}>{sending ? '送信中…' : '内容を確認して応募する'}</button>{result && <p role="status">{result}</p>}</div>
}
