import type { FestEvent } from "@/lib/festEvents";
import { todayISO } from "@/lib/festEvents";
import { formatDateRange, gradientIndex } from "@/lib/festDate";

function dayBadge(startDate: string): string | null {
  const today = todayISO();
  const tomorrow = new Date(new Date(`${today}T00:00:00+09:00`).getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  if (startDate === today) return "本日開催";
  if (startDate === tomorrow) return "あす開催";
  return null;
}

function ThumbDate({ startDate }: { startDate: string }) {
  const dt = new Date(`${startDate}T00:00:00+09:00`);
  const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  return (
    <div className="d">
      <b>{dt.getMonth() + 1}/{dt.getDate()}</b>
      <span>{w}</span>
    </div>
  );
}

export default function EventList({
  events,
  headingLabel = "",
}: {
  events: FestEvent[];
  headingLabel?: string;
}) {
  return (
    <main className="list-side">
      <div className="list-head">
        <h1>
          {headingLabel}のフェス・イベント <span>{events.length}件</span>
        </h1>
      </div>
      <p className="list-note">
        外部イベントは主催者の公式発表をもとに掲載しています。詳細・チケットは公式サイトをご確認ください。
      </p>

      {events.map((ev) => {
        const isExternal = ev.source === "external";
        const badge = dayBadge(ev.start_date);
        const gClass = `g${gradientIndex(ev.id, 5)}`;
        const href = isExternal
          ? ev.official_url ?? "#"
          : ev.source_event_id
            ? `/browse/${ev.source_event_id}`
            : "#";

        return (
          <a
            key={ev.id}
            className={`fcard${isExternal ? " ext" : ""}`}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "nofollow noopener" : undefined}
          >
            {badge && <span className="badge-today">{badge}</span>}
            <div className={`fthumb ${gClass}`}>
              <ThumbDate startDate={ev.start_date} />
            </div>
            <div className="fbody">
              <div className="when">{formatDateRange(ev.start_date, ev.end_date)}</div>
              <h2>{ev.title}</h2>
              <p className="where">
                {ev.venue_name}
                {ev.prefecture ? `（${ev.prefecture}）` : ""}
              </p>
              <div className="ftags">
                {ev.has_kitchen_cars && (
                  <span className="kc">
                    {ev.kitchen_car_count ? `キッチンカー${ev.kitchen_car_count}台` : "キッチンカー出店あり"}
                  </span>
                )}
                {ev.genre_tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              {isExternal && (
                <div className="ext-src">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 4h6v6M20 4 10 14M18 13v6H5V6h6" />
                  </svg>
                  外部イベント・チケットは公式サイトへ
                </div>
              )}
            </div>
          </a>
        );
      })}

      {events.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "24px 4px" }}>
          現在掲載中のイベントはありません。
        </p>
      )}
    </main>
  );
}
