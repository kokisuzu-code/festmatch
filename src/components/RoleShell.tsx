import Link from "next/link"
import BrandMark from "@/components/BrandMark"

const organizerLinks = [["/organizer", "概要"], ["/organizer/events", "イベント"], ["/organizer/settings", "設定"]] as const
const vendorLinks = [["/vendor", "概要"], ["/vendor/events", "イベントを探す"], ["/vendor/applications", "応募状況"], ["/vendor/messages", "チャット"], ["/vendor/sales", "売上記録"], ["/vendor/settings", "プロフィール"]] as const

export default function RoleShell({ role, children }: { role: "organizer" | "vendor"; children: React.ReactNode }) {
  const links = role === "organizer" ? organizerLinks : vendorLinks
  return <div className={`role-shell ${role === "vendor" ? "vendor-theme" : "organizer-theme"}`}><header className="role-header"><BrandMark href={role === "organizer" ? "/organizer" : "/vendor"} /><nav aria-label="主要ナビゲーション">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}<form action="/auth/signout" method="post"><button className="role-signout" type="submit">ログアウト</button></form></nav></header><main className="role-main">{children}</main></div>
}
