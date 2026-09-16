import Link from 'next/link'
import BrandMark from '@/components/BrandMark'

export const metadata = {
  title: '開発者ページ',
  description: 'FestMatchの公開導線と開発状況を、ログインなしで確認するためのページです。',
  robots: { index: false, follow: false },
}

/**
 * This route deliberately contains no Supabase client, dashboard data, or
 * privileged action. It is a public development guide, not an auth bypass.
 */
export default function DeveloperPage() {
  return <main className="developer-page"><header className="developer-header"><BrandMark /><nav><Link href="/">トップ</Link><Link href="/festmap">FestMap</Link><Link href="/login">ログイン</Link></nav></header><section className="developer-hero"><p className="eyebrow">DEVELOPER ACCESS</p><h1>役割ごとの画面を、<br />ログインなしで確認。</h1><p>公開範囲の動作確認と、主催者・出店者それぞれの画面デザインを確認するためのページです。公開デモはサンプルデータのみを表示し、アカウント情報、売上、応募、チャットなどの非公開データには接続しません。</p><div className="button-row"><Link className="button button-primary" href="/developer/organizer">主催者デモを見る</Link><Link className="button button-secondary" href="/developer/vendor">出店者デモを見る</Link></div></section><section className="developer-role-grid" aria-label="役割別の公開デモ"><article><p className="eyebrow">ORGANIZER</p><h2>イベント掲載から、応募・区画管理まで。</h2><p>主催者ワークスペースの構成と運営導線を確認できます。</p><Link href="/developer/organizer">主催者デモを開く <span>→</span></Link></article><article><p className="eyebrow">VENDOR</p><h2>出店先探しから、応募・振り返りまで。</h2><p>出店者ワークスペースの構成と応募導線を確認できます。</p><Link href="/developer/vendor">出店者デモを開く <span>→</span></Link></article></section><section className="developer-grid" aria-label="開発者向けの確認導線"><article><p className="eyebrow">PUBLIC</p><h2>ログイン不要の確認</h2><ul><li><Link href="/festmap">FestMap の公開イベント一覧</Link></li><li><Link href="/">FestMatch のトップページ</Link></li><li><Link href="/signup">新規登録とオンボーディング</Link></li></ul></article><article><p className="eyebrow">IMPLEMENTED</p><h2>現在の主要機能</h2><ul><li>イベント作成、応募、承認、Stripe決済</li><li>FestMap、公開ベンダープロフィール、埋め込み応募</li><li>ジャンル別枠、出店区画、承認済み参加者とのチャット</li></ul></article><article><p className="eyebrow">SECURITY</p><h2>認証が必要な範囲</h2><ul><li>実データを扱う主催者・ベンダーのダッシュボード</li><li>応募の承認、区画割当、メッセージ送信</li><li>売上、請求、プロフィールなどの個人・組織データ</li></ul></article></section><section className="developer-note"><h2>開発時の注意</h2><p>本番データへ影響する操作は、必ず主催者またはベンダーのアカウントでログインして確認してください。双方向チャットは、公開前に電気通信事業法上の届出要否の確認が必要です。</p></section></main>
}
