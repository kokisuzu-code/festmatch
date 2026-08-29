import Link from "next/link"
import BrandMark from "@/components/BrandMark"
import "./public.css"

export default function FestMapLayout({ children }: { children: React.ReactNode }) {
  return <div className="festmap-page"><header className="festmap-header"><BrandMark href="/home" /><nav><Link href="/festmap">イベントを探す</Link><Link href="/login">ログイン</Link><Link href="/signup?role=vendor">ベンダー登録</Link><Link href="/signup?role=organizer">主催者登録</Link></nav></header>{children}<footer className="festmap-footer"><BrandMark href="/home" /><span>FestMatch の一般公開イベントディレクトリ</span></footer></div>
}
