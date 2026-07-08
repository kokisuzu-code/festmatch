import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FEST_EVENT_COLUMNS, todayISO, type FestEvent } from "@/lib/festEvents";
import { formatDateRange, gradientIndex } from "@/lib/festDate";

function statusBadge(ev: FestEvent): { label: string; className: string } {
  if (ev.slots_remaining != null && ev.slots_remaining <= 2) {
    return { label: "締切間近", className: "status closing" };
  }
  return { label: "募集中", className: "status" };
}

export default async function OpenEventsGrid() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fest_events")
    .select(FEST_EVENT_COLUMNS)
    .eq("source", "festmatch")
    .eq("published", true)
    .gte("end_date", todayISO())
    .order("start_date", { ascending: true })
    .limit(6);

  const events = (data ?? []) as FestEvent[];

  if (events.length === 0) return null;

  return (
    <section className="section" id="events">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">OPEN FOR VENDORS</span>
          <h2 className="display">出店者募集中のフェス</h2>
          <p>いま申請できるイベントの一覧です。気になるフェスにワンタップで出店申請。</p>
        </div>
        <div className="event-grid">
          {events.map((ev) => {
            const badge = statusBadge(ev);
            const tClass = `t${gradientIndex(ev.id, 6)}`;
            return (
              <Link
                key={ev.id}
                className="event-card"
                href={ev.source_event_id ? `/browse/${ev.source_event_id}` : "#"}
              >
                <div className={`event-thumb ${tClass}`}>
                  <span className={badge.className}>{badge.label}</span>
                </div>
                <div className="event-body">
                  <div className="event-date">{formatDateRange(ev.start_date, ev.end_date)}</div>
                  <h3>{ev.title}</h3>
                  <p className="event-loc">
                    {ev.prefecture ? `${ev.prefecture}・${ev.venue_name}` : ev.venue_name}
                  </p>
                  <div className="event-meta">
                    {ev.slots_remaining != null && (
                      <span className="slots">残り{ev.slots_remaining}枠</span>
                    )}
                    {ev.fee_from != null && <span>出店料 ¥{ev.fee_from.toLocaleString()}〜</span>}
                    {ev.has_power && <span>電源あり</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="events-more">
          <Link className="btn btn-ghost" href="/festmap">
            募集中のフェスをすべて見る →
          </Link>
        </div>
      </div>
    </section>
  );
}
