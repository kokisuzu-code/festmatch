import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/festEvents";
import HeroWithMap from "@/components/marketing/HeroWithMap";
import PrefStrip from "@/components/marketing/PrefStrip";
import OpenEventsGrid from "@/components/marketing/OpenEventsGrid";
import DualPath from "@/components/marketing/DualPath";
import FeatureGrid from "@/components/marketing/FeatureGrid";
import StepsSection from "@/components/marketing/StepsSection";
import PricingSection from "@/components/marketing/PricingSection";
import FinalCta from "@/components/marketing/FinalCta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FestMatch | フェスとキッチンカーをつなぐ、主催者自走型プラットフォーム",
  description:
    "FestMatchは、フェス・イベントの主催者とキッチンカーを直接つなぐプラットフォーム。出店募集から申請、区画割り、出店料の決済まですべて完結。担当者不要、登録すれば即日利用開始。",
  openGraph: {
    title: "FestMatch | 主催者自走型キッチンカーマッチング",
    description: "出店募集から決済まで、担当者不要で完結するフェス出店管理SaaS。",
    url: "https://festmatch.jp",
    siteName: "FestMatch",
    locale: "ja_JP",
    type: "website",
  },
};

export default async function MarketingPage() {
  const supabase = await createClient();

  // ログイン済みはロール別ダッシュボードへ、未ログインはマーケティングトップを表示
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  const { count } = await supabase
    .from("fest_events")
    .select("id", { count: "exact", head: true })
    .eq("published", true)
    .gte("end_date", todayISO());

  return (
    <>
      <HeroWithMap upcomingCount={count ?? 0} />
      <PrefStrip />
      <OpenEventsGrid />
      <DualPath />
      <FeatureGrid />
      <StepsSection />
      <PricingSection />
      <FinalCta />
    </>
  );
}
