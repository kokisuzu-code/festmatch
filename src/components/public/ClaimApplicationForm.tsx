'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ClaimApplicationForm({ token }: { token: string }) {
  const [message, setMessage] = useState(""); const [sending, setSending] = useState(false); const router = useRouter()
  async function claim() { setSending(true); setMessage(""); const response = await fetch("/api/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); const body = await response.json(); if (response.ok) router.replace("/vendor/applications"); else { setSending(false); setMessage(body.error ?? "応募を完了できませんでした。") } }
  return <section className="claim-card"><p className="eyebrow">APPLICATION CLAIM</p><h1>応募を完了する</h1><p>ログイン済みのメールアドレスと応募時のメールアドレスが一致すると、ベンダープロフィールと正式応募が作成されます。</p><button className="button button-primary" disabled={sending} onClick={claim}>{sending ? "確認中" : "応募を完了する"}</button>{message && <p className="form-message">{message}</p>}</section>
}
