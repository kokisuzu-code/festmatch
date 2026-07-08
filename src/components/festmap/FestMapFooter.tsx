import Link from "next/link";

export default function FestMapFooter() {
  return (
    <footer>
      <div className="wrap">
        <div>© 2026 FestMap by FestMatch</div>
        <div style={{ display: "flex", gap: 18 }}>
          <Link href="/">FestMatchについて</Link>
          <a href="#">利用規約</a>
          <a href="#">プライバシーポリシー</a>
          <a href="#">お問い合わせ</a>
        </div>
      </div>
    </footer>
  );
}
