'use client'

import Link from 'next/link'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="panel empty-state" role="alert"><h1>読み込みを完了できませんでした</h1><p>通信状況を確認し、もう一度お試しください。</p><div className="button-row"><button className="button button-primary" onClick={reset}>再読み込み</button><Link className="button button-secondary" href="/dashboard">ホームへ戻る</Link><Link className="button button-secondary" href="/login">ログインを確認</Link></div></main>
}
