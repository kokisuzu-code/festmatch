import Link from "next/link";

export default function DualPath() {
  return (
    <section className="section" id="host">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">FOR ORGANIZERS &amp; VENDORS</span>
          <h2 className="display">あなたはどちらですか？</h2>
          <p>FestMatchは、募集する側と出店する側、両方のための場所です。</p>
        </div>
        <div className="dual">
          <div className="path path-host">
            <div className="free">月12万円〜</div>
            <h3>フェス・イベント主催者</h3>
            <p className="who">自治体・商店街・イベント会社・学園祭実行委員</p>
            <ul>
              <li>イベントを掲載してキッチンカーを募集</li>
              <li>ジャンル枠設定で「唐揚げばかり」を自動防止</li>
              <li>申請の承認・見送りをワンクリック、断り文は自動送信</li>
              <li>区画ごとに出店料を設定、オンラインで自動回収</li>
              <li>キャンセル時は補欠を自動繰り上げ</li>
            </ul>
            <a className="btn btn-primary" href="#pricing">
              イベントを掲載する
            </a>
          </div>
          <div className="path path-vendor" id="vendor">
            <h3>キッチンカー・ベンダー</h3>
            <p className="who">キッチンカーオーナー・移動販売・クラフト出店者</p>
            <ul>
              <li>全国のフェス・イベントの募集をマップで検索</li>
              <li>プロフィールを一度作れば、申請はワンタップ</li>
              <li>出店料の支払いもアプリ内で完結</li>
              <li>登録無料。まずは1件、出店してみる</li>
            </ul>
            <Link className="btn btn-night" href="/signup?role=vendor">
              ベンダー登録(無料)
            </Link>
            <p className="mode-note">※ ベンダー向けアプリはスマホ・タブレット専用のダークUIです</p>
          </div>
        </div>
      </div>
    </section>
  );
}
