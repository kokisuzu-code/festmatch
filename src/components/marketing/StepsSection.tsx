export default function StepsSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2 className="display">はじめ方は、3ステップ。</h2>
        </div>
        <div className="steps">
          <div className="step">
            <h3>イベントを掲載する</h3>
            <p>開催日・会場・区画と出店料を入力。掲載と同時にFestMapにも自動で公開されます。</p>
          </div>
          <div className="step">
            <h3>申請を受けて、選ぶ</h3>
            <p>ベンダーからの出店申請が届きます。プロフィールとメニューを見て、ワンクリックで承認。</p>
          </div>
          <div className="step">
            <h3>当日を迎えるだけ</h3>
            <p>出店料は自動で回収済み。区画割りも連絡も完了。あとはフェスを楽しむだけです。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
