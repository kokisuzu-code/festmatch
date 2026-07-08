// FestMap / マーケティングトップ共通の日付表示・ハッシュユーティリティ

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatSingleDate(dateStr: string): string {
  const dt = new Date(`${dateStr}T00:00:00+09:00`);
  const w = WEEKDAYS[dt.getDay()];
  return `${dt.getMonth() + 1}/${dt.getDate()}(${w})`;
}

export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatSingleDate(start);
  return `${formatSingleDate(start)}–${formatSingleDate(end)}`;
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string
  );
}

/** イベントIDから決定的にグラデーション番号(1〜count)を選ぶ */
export function gradientIndex(id: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (hash % count) + 1;
}
