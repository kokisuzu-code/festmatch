import { Noto_Sans_JP } from "next/font/google";
import "./festmap.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export default function FestMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={`fm-festmap ${notoSansJP.className}`}>{children}</div>;
}
