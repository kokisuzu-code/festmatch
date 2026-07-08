import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PREFECTURES, findPrefectureBySlug } from "@/lib/prefectures";
import { FEST_EVENT_COLUMNS, todayISO, type FestEvent } from "@/lib/festEvents";
import FestMapHeader from "@/components/festmap/FestMapHeader";
import FilterBar from "@/components/festmap/FilterBar";
import FestMapViewClient from "@/components/festmap/FestMapViewClient";
import EventList from "@/components/festmap/EventList";
import SeoLinks from "@/components/festmap/SeoLinks";
import BizBand from "@/components/festmap/BizBand";
import FestMapFooter from "@/components/festmap/FestMapFooter";
import Link from "next/link";

export const revalidate = 3600;

export function generateStaticParams() {
  return PREFECTURES.map((p) => ({ pref: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pref: string }>;
}): Promise<Metadata> {
  const { pref: prefSlug } = await params;
  const pref = findPrefectureBySlug(prefSlug);
  if (!pref) return {};

  const supabase = await createClient();
  const { count } = await supabase
    .from("fest_events")
    .select("id", { count: "exact", head: true })
    .eq("published", true)
    .eq("prefecture_slug", pref.slug)
    .gte("end_date", todayISO());

  const base: Metadata = {
    title: `${pref.name}のフェス・イベント一覧 | FestMap`,
    description: `${pref.name}で開催されるフェス・マルシェ・キッチンカーイベントを日付順で紹介。開催地は地図からも確認できます。`,
  };

  if (!count) {
    return { ...base, robots: { index: false } };
  }
  return base;
}

function currentWeekend(): { sat: string; sun: string } {
  const today = new Date(`${todayISO()}T00:00:00+09:00`);
  const day = today.getDay();
  const daysUntilSat = (6 - day + 7) % 7;
  const sat = new Date(today.getTime() + daysUntilSat * 86400000);
  const sun = new Date(sat.getTime() + 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { sat: fmt(sat), sun: fmt(sun) };
}

export default async function PrefFestMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ pref: string }>;
  searchParams: Promise<{ date?: string; tag?: string; q?: string }>;
}) {
  const { pref: prefSlug } = await params;
  const pref = findPrefectureBySlug(prefSlug);
  if (!pref) notFound();

  const { date, tag, q } = await searchParams;
  const supabase = await createClient();
  const today = todayISO();

  let query = supabase
    .from("fest_events")
    .select(FEST_EVENT_COLUMNS)
    .eq("published", true)
    .eq("prefecture_slug", pref.slug)
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
      <FilterBar
        activeDate={date}
        activeTag={tag}
        monthLabel={headingLabel}
        basePath={`/festmap/${pref.slug}`}
      />
      <div className="split">
        <FestMapViewClient events={events} />
        <EventList events={events} headingLabel={`${pref.name}の${headingLabel}`} />
      </div>

      {events.length === 0 && (
        <section style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>現在{pref.name}で掲載中のイベントはありません。</p>
          <Link className="btn" href="/#pricing" style={{
            display: "inline-block",
            background: "var(--shu)",
            color: "#fff",
            borderRadius: 999,
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: 14,
          }}>
            主催者の方はイベントを掲載する →
          </Link>
        </section>
      )}

      <section className="seo">
        <div className="wrap">
          <h2>他の都道府県からフェスを探す</h2>
          <div className="links">
            {PREFECTURES.filter((p) => p.slug !== pref.slug).map((p) => (
              <Link key={p.slug} href={`/festmap/${p.slug}`}>
                {p.name}のフェス
              </Link>
            ))}
          </div>
        </div>
      </section>
      <SeoLinks />
      <BizBand />
      <FestMapFooter />
    </>
  );
}
