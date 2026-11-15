import Link from "next/link"
import BrandMark from "@/components/BrandMark"
import OrganizerPreview from "./OrganizerPreview"

type PreviewRole = "organizer" | "vendor"

const content = {
  vendor: {
    eyebrow: "VENDOR PREVIEW",
    title: "出店者向けの操作画面を、先に体験。",
    lead: "自分に合うイベント探し、応募状況、出店の振り返りをまとめるベンダーワークスペースの公開デモです。個人情報、応募内容、売上は表示・保存しません。",
    primary: "出店者として登録する",
    primaryHref: "/signup?role=vendor",
    metrics: [["応募中", "2", "返答待ちを含む"], ["承認済み", "1", "次回の出店予定"], ["未読メッセージ", "3", "主催者からのお知らせ"]],
    section: "最近の応募",
    rows: [["港のサマーマーケット", "8月19日(水) ・ 横浜市", "承認済み"], ["秋のリバーサイド市", "9月7日(日) ・ 川崎市", "確認中"]],
    noticeTitle: "出店先選びから、次の改善まで。",
    notice: "条件に合うイベントを探し、応募・スケジュール・売上記録を一つに。実際の内容は出店者アカウントだけに表示されます。",
  },
} as const

export default function RolePreview({ role }: { role: PreviewRole }) {
  if (role === "organizer") return <OrganizerPreview />
  const preview = content[role]

  return <main className={`developer-preview developer-preview-${role}`}>
    <header className="developer-preview-header"><div><BrandMark /><nav aria-label="開発者ページのナビゲーション"><Link href="/developer">開発者ページ</Link><Link href="/festmap">FestMap</Link><Link href="/">トップ</Link></nav></div></header>
    <section className="developer-preview-hero"><div><p className="eyebrow">{preview.eyebrow}</p><h1>{preview.title}</h1><p>{preview.lead}</p><div><Link className="button button-primary" href={preview.primaryHref}>{preview.primary}</Link><Link className="button button-secondary" href="/developer">他のデモを見る</Link></div></div><aside><span>公開デモ</span><strong>出店者ワークスペース</strong><small>ログイン・データ操作は不要です</small></aside></section>
    <section className="developer-preview-workspace" aria-label="出店者画面の公開デモ">
      <div className="developer-preview-title"><div><p className="eyebrow">DASHBOARD DEMO</p><h2>自分に合う出店先を、迷わず選ぶ。</h2></div><span>サンプルデータ</span></div>
      <div className="developer-preview-metrics">{preview.metrics.map(([label, number, note]) => <article key={label}><span>{label}</span><strong>{number}</strong><small>{note}</small></article>)}</div>
      <div className="developer-preview-grid"><section><div className="developer-preview-section-title"><div><p className="eyebrow">OVERVIEW</p><h2>{preview.section}</h2></div><span>サンプル</span></div><div className="developer-preview-rows">{preview.rows.map(([title, detail, status]) => <article key={title}><div><strong>{title}</strong><span>{detail}</span></div><b>{status}</b></article>)}</div></section><aside><div className="developer-preview-notice-icon">⌖</div><h2>{preview.noticeTitle}</h2><p>{preview.notice}</p><Link href={preview.primaryHref}>{preview.primary} <span>→</span></Link></aside></div>
    </section>
    <footer className="developer-preview-footer"><p>このページはデザインと公開導線の確認専用です。</p><Link href="/developer">開発者ページへ戻る</Link></footer>
  </main>
}
