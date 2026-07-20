import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import ClaimApplicationForm from "@/components/public/ClaimApplicationForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "応募を完了", description: "FestMatchの未認証応募を正式応募へ変換します。" }

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!token) return <main className="public-apply-page"><section className="claim-card"><h1>応募リンクが見つかりません</h1><p>メールに記載されたリンクをもう一度開いてください。</p></section></main>
  if (!user) return <main className="public-apply-page"><section className="claim-card"><h1>ログインが必要です</h1><p>応募に使用したメールアドレスでログインしてください。</p><Link className="button button-primary" href={`/login?claim=${encodeURIComponent(token)}`}>ログインへ進む</Link></section></main>
  return <main className="public-apply-page"><ClaimApplicationForm token={token} /></main>
}
