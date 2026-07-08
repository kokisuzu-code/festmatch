export type FestEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  prefecture: string | null;
  prefecture_slug: string | null;
  source: "festmatch" | "external";
  source_event_id: string | null;
  official_url: string | null;
  genre_tags: string[];
  has_kitchen_cars: boolean;
  kitchen_car_count: number | null;
  fee_from: number | null;
  total_slots: number | null;
  slots_remaining: number | null;
  has_power: boolean;
  lat: number | null;
  lng: number | null;
};

export const FEST_EVENT_COLUMNS =
  "id, title, start_date, end_date, venue_name, prefecture, prefecture_slug, source, source_event_id, official_url, genre_tags, has_kitchen_cars, kitchen_car_count, fee_from, total_slots, slots_remaining, has_power, lat, lng";

export function todayISO(): string {
  // JSTでの「今日」を返す（サーバーのタイムゾーンに依存しないように固定オフセットで計算）
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
