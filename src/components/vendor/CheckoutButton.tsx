'use client'

import { useState } from "react"

export default function CheckoutButton({ applicationId }: { applicationId: string }) {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  async function checkout() { setLoading(true); setMessage(""); const response = await fetch("/api/stripe/application-checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ application_id: applicationId }) }); const body = await response.json(); if (response.ok && body.url) window.location.assign(body.url); else { setLoading(false); setMessage(body.error ?? "決済を開始できませんでした。") } }
  return <div className="action-box"><button className="button button-primary" disabled={loading} aria-busy={loading} onClick={checkout}>{loading ? "決済ページを準備中…" : "出店料を支払う"}</button>{message && <p>{message}</p>}</div>
}
