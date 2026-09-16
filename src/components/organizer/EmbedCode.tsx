'use client'

import { useState } from "react"
import { APP_URL } from "@/lib/app"

export default function EmbedCode({ slug }: { slug: string }) {
  const code = `<iframe src="${APP_URL}/embed/events/${slug}" title="FestMatch 出店応募" width="100%" height="620" style="border:0;max-width:560px" loading="lazy"></iframe>`
  const [copied, setCopied] = useState(false)
  async function copy() { await navigator.clipboard.writeText(code); setCopied(true) }
  return <section className="embed-code"><p>デプロイ環境の <code>FESTMATCH_EMBED_ALLOWED_ORIGINS</code> に登録済みの Origin へ、次のコードを貼り付けてください。</p><textarea readOnly value={code} rows={5} aria-label="埋め込みコード" /><button type="button" className="button button-secondary" onClick={copy}>{copied ? "コピーしました" : "コードをコピー"}</button></section>
}
