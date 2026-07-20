'use client'

import { useState } from "react"

export default function ApplyButton({ eventId, closed, disabledReason }: { eventId: string; closed: boolean; disabledReason?: string }) {
  const [message, setMessage] = useState("")
  const [result, setResult] = useState("")
  const [sending, setSending] = useState(false)
  async function apply() { setSending(true); setResult(""); const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event_id: eventId, message }) }); const body = await response.json(); setSending(false); setResult(response.ok ? "応募を送信しました。主催者からの連絡をお待ちください。" : body.error ?? "応募できませんでした。") }
  if (closed) return <span className="status">応募受付終了</span>
  if (disabledReason) return <span className="status slot-full-status">{disabledReason}</span>
  return <div className="apply-box"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="主催者へのメッセージ（任意）" rows={3} /><button className="button button-primary" disabled={sending} onClick={apply}>{sending ? "送信中" : "応募する"}</button><small>無料プランを含め、すべてのベンダーが応募できます。</small>{result && <p>{result}</p>}</div>
}
