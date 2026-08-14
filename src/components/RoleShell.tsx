import Link from "next/link"
import BrandMark from "@/components/BrandMark"
import OrganizerShell from '@/components/OrganizerShell'

const vendorLinks = [["/vendor", "概要"], ["/vendor/events", "イベントを探す"], ["/vendor/applications", "応募状況"], ["/vendor/messages", "チャット"], ["/vendor/sales", "売上記録"], ["/vendor/settings", "プロフィール"]] as const

export default function RoleShell({ role, children }: { role: "organizer" | "vendor"; children: React.ReactNode }) {
  if (role === 'organizer') return <OrganizerShell>{children}</OrganizerShell>
  return <div className="role-shell vendor-theme"><header className="role-header"><BrandMark href="/vendor" /><nav aria-label="主要ナビゲーション">{vendorLinks.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}<form action="/auth/signout" method="post"><button className="role-signout" type="submit">ログアウト</button></form></nav></header><main className="role-main">{children}</main></div>
}
