import Link from "next/link";
import { PREFECTURES } from "@/lib/prefectures";

const GENRES = [
  "キッチンカーイベント",
  "グルメフェス",
  "マルシェ・朝市",
  "音楽フェス",
  "クラフトマーケット",
  "ビールフェス",
  "ファミリー向け",
];

export default function SeoLinks() {
  return (
    <section className="seo">
      <div className="wrap">
        <h2>エリアからフェスを探す</h2>
        <div className="links">
          {PREFECTURES.map((p) => (
            <Link key={p.slug} href={`/festmap/${p.slug}`}>
              {p.name}のフェス
            </Link>
          ))}
        </div>
        <h2>ジャンルから探す</h2>
        <div className="links">
          {GENRES.map((g) => (
            <a key={g} href="#">
              {g}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
