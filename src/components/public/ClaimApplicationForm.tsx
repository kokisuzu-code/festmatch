'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "@/app/(auth)/login/login.module.css"

export default function ClaimApplicationForm({ token }: { token: string }) {
  const [message, setMessage] = useState(""); const [sending, setSending] = useState(false); const router = useRouter()
  async function claim() { setSending(true); setMessage(""); const response = await fetch("/api/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); const body = await response.json(); if (response.ok) router.replace("/vendor/applications"); else { setSending(false); setMessage(body.error ?? "応募を完了できませんでした。") } }
  return <div className={styles.form}><p className={styles.notice}>ログイン中のメールアドレスと応募時のメールアドレスが一致する場合、ベンダープロフィールと正式応募を作成します。</p><button className={styles.submit} disabled={sending} aria-busy={sending} onClick={claim}><span>{sending ? "確認中…" : "応募を完了する"}</span>{!sending && <span aria-hidden="true">→</span>}</button>{message && <p className={styles.message} role="alert">{message}</p>}</div>
}
