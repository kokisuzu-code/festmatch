import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://festmatch-pink.vercel.app"),
  title: { default: "FestMatch | 主催者自走型の出店管理SaaS", template: "%s | FestMatch" },
  description: "FestMatchは、イベント主催者とベンダーを直接つなぐ主催者自走型の出店管理SaaSです。",
  openGraph: { type: "website", locale: "ja_JP", siteName: "FestMatch", title: "FestMatch | 主催者自走型の出店管理SaaS", description: "募集から応募、決済までを主催者自身で完結できます。" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
