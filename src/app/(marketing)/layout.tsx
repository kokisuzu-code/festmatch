import { Noto_Sans_JP } from "next/font/google";
import "./marketing.css";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`fm-marketing ${notoSansJP.className}`}>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
