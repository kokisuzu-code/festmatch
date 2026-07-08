import Link from "next/link";

const FEATURED_PREFS = [
  { name: "東京", slug: "tokyo" },
  { name: "神奈川", slug: "kanagawa" },
  { name: "埼玉", slug: "saitama" },
  { name: "千葉", slug: "chiba" },
  { name: "大阪", slug: "osaka" },
  { name: "愛知", slug: "aichi" },
  { name: "福岡", slug: "fukuoka" },
  { name: "北海道", slug: "hokkaido" },
];

export default function PrefStrip() {
  return (
    <div className="pref-strip">
      <div className="container">
        <span>エリアから探す</span>
        {FEATURED_PREFS.map((p) => (
          <Link key={p.slug} href={`/festmap/${p.slug}`}>
            {p.name}
          </Link>
        ))}
        <Link href="/festmap">すべての都道府県 →</Link>
      </div>
    </div>
  );
}
