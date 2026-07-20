'use client'

import { useState } from "react"

export default function ConnectStripeButton() {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  async function connect() { setLoading(true); setMessage(""); const response = await fetch("/api/stripe/connect", { method: "POST" }); const body = await response.json(); if (response.ok && body.url) window.location.assign(body.url); else { setLoading(false); setMessage(body.error ?? "Stripe Connectを開始できませんでした。") } }
  return <div className="action-box"><button className="button button-primary" disabled={loading} onClick={connect}>{loading ? "準備中" : "Stripe Connect を設定"}</button>{message && <p>{message}</p>}</div>
}
