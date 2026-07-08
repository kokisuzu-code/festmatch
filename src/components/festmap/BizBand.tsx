import Link from "next/link";

export default function BizBand() {
  return (
    <section className="biz-band">
      <div className="wrap">
        <div>
          <h2>イベントを主催している方・キッチンカーの方へ</h2>
          <p>FestMapに掲載されるイベントは、出店管理プラットフォーム「FestMatch」から自動で公開されています。</p>
        </div>
        <div className="btns">
          <Link className="b1" href="/#pricing">
            イベントを掲載する（主催者）
          </Link>
          <Link className="b2" href="/signup?role=vendor">
            出店先を探す（ベンダー）
          </Link>
        </div>
      </div>
    </section>
  );
}
