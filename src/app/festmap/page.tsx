import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FEST_EVENT_COLUMNS, todayISO, type FestEvent } from "@/lib/festEvents";
import FestMapHeader from "@/components/festmap/FestMapHeader";
import FilterBar from "@/components/festmap/FilterBar";
import FestMapViewClient from "@/components/festmap/FestMapViewClient";
import EventList from "@/components/festmap/EventList";
import SeoLinks from "@/components/festmap/SeoLinks";
import BizBand from "@/components/festmap/BizBand";
import FestMapFooter from "@/components/festmap/FestMapFooter";

export const revalidate = 3600;
export const dynamicParams = true;

export const metadata: Metadata = {
  title: "FestMap | 全国のフェス・マルシェ・キッチンカーイベントを地図から探す",
  description:
    "今週末どこ行く？FestMapは全国のフェス・マルシェ・グルメイベントを地図とカレンダーから探せる無料サービスです。",
};

function currentWeekend(): { sat: string; sun: string } {
  const today = new Date(`${todayISO()}T00:00:00+09:00`);
  const day = today.getDay(); // 0=日,6=土
  const daysUntilSat = (6 - day + 7) % 7;
  const sat = new Date(today.getTime() + daysUntilSat * 86400000);
  const sun = new Date(sat.getTime() + 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { sat: fmt(sat), sun: fmt(sun) };
}

export default async function FestMapPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tag?: string; q?: string }>;
}) {
  const { date, tag, q } = await searchParams;
  const supabase = await createClient();
  const today = todayISO();

  let query = supabase
    .from("fest_events")
    .select(FEST_EVENT_COLUMNS)
    .eq("published", true)
    .gte("end_date", today);

  let headingLabel: string;
  if (date === "weekend") {
    const { sat, sun } = currentWeekend();
    query = query.lte("start_date", sun).gte("end_date", sat);
    headingLabel = "今週末";
  } else {
    const now = new Date(`${today}T00:00:00+09:00`);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    query = query.lte("start_date", lastDayOfMonth);
    headingLabel = `${now.getMonth() + 1}月`;
  }

  if (tag === "kitchen-car") {
    query = query.eq("has_kitchen_cars", true);
  } else if (tag) {
    query = query.contains("genre_tags", [tag]);
  }

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,venue_name.ilike.%${q}%,prefecture.ilike.%${q}%`
    );
  }

  const { data } = await query.order("start_date", { ascending: true }).limit(100);
  const events = (data ?? []) as FestEvent[];

  return (
    <>
      <FestMapHeader initialQuery={q} />
      <FilterBar activeDate={date} activeTag={tag} monthLabel={headingLabel} />
      <div className="split">
        <FestMapViewClient events={events} />
        <EventList events={events} headingLabel={headingLabel} />
      </div>
      <SeoLinks />
      <BizBand />
      <FestMapFooter />
    </>
  );
}
