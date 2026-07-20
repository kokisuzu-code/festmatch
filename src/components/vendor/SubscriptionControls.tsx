'use client'

import { useState } from "react"

export default function SubscriptionControls() {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  async function start(tier: "light" | "standard" | "pro") { setLoading(tier); setMessage(""); const response = await fetch("/api/stripe/subscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier }) }); const body = await response.json(); if (response.ok && body.url) window.location.assign(body.url); else { setLoading(null); setMessage(body.error ?? "プランを開始できませんでした。") } }
  async function portal() { setLoading("portal"); setMessage(""); const response = await fetch("/api/stripe/portal", { method: "POST" }); const body = await response.json(); if (response.ok && body.url) window.location.assign(body.url); else { setLoading(null); setMessage(body.error ?? "管理画面を開けませんでした。") } }
  return <div className="subscription-controls"><div className="plan-button-grid">{(["light", "standard", "pro"] as const).map((tier) => <button key={tier} className="button button-secondary" disabled={Boolean(loading)} onClick={() => start(tier)}>{loading === tier ? "準備中" : `${tier[0].toUpperCase()}${tier.slice(1)} を選ぶ`}</button>)}</div><button className="text-button" disabled={Boolean(loading)} onClick={portal}>{loading === "portal" ? "準備中" : "Stripeのプラン管理を開く"}</button>{message && <p>{message}</p>}</div>
}
