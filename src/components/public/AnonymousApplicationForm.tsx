'use client'

import { useState } from "react"

export default function AnonymousApplicationForm({ eventId, title }: { eventId: string; title: string }) {
  const [email, setEmail] = useState(""); const [vendorName, setVendorName] = useState(""); const [genre, setGenre] = useState(""); const [message, setMessage] = useState(""); const [result, setResult] = useState(""); const [sending, setSending] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSending(true); setResult(""); const response = await fetch("/api/pending-applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event_id: eventId, email, vendor_name: vendorName, genre, message }) }); const body = await response.json(); setSending(false); setResult(response.ok ? "確認メールを送信しました。メール内のリンクから応募を完了してください。" : body.error ?? "応募を送信できませんでした。") }
  return <form className="public-apply-form" onSubmit={submit}><h2>{title} に応募</h2><p>メールアドレスの確認後に、正式な応募として主催者へ送信されます。</p><label className="field">ベンダー名<input required value={vendorName} onChange={(event) => setVendorName(event.target.value)} /></label><label className="field">ジャンル<input value={genre} onChange={(event) => setGenre(event.target.value)} /></label><label className="field">メールアドレス<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field">主催者へのメッセージ<textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></label><button className="button button-primary" disabled={sending} aria-busy={sending}>{sending ? "送信中…" : "メールを確認して応募する"}</button>{result && <p className="form-message">{result}</p>}</form>
}
