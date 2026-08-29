import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import ClaimApplicationForm from "@/components/public/ClaimApplicationForm"
import AuthShell from "@/components/auth/AuthShell"
import styles from "@/app/(auth)/login/login.module.css"

export const dynamic = "force-dynamic"
export const metadata = { title: "応募を完了", description: "FestMatchの未認証応募を正式応募へ変換します。" }

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!token) return <AuthShell eyebrow="APPLICATION CLAIM" title="応募リンクが見つかりません" description="メールに記載されたリンクをもう一度開いてください。"><Link className={styles.submit} href="/home"><span>ホームへ戻る</span><span aria-hidden="true">→</span></Link></AuthShell>
  if (!user) return <AuthShell eyebrow="APPLICATION CLAIM" title="ログインが必要です" description="応募に使用したメールアドレスでログインしてください。"><Link className={styles.submit} href={`/login?claim=${encodeURIComponent(token)}`}><span>ログインへ進む</span><span aria-hidden="true">→</span></Link></AuthShell>
  return <AuthShell eyebrow="APPLICATION CLAIM" title="応募を完了する" description="アカウントと応募内容を確認して、正式応募へ進みます。"><ClaimApplicationForm token={token} /></AuthShell>
}
