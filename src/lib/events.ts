export type EventTiming = { starts_at: string; ends_at: string; application_deadline_at: string | null }

export function isEventEnded(event: Pick<EventTiming, "ends_at">, now = new Date()) {
  return new Date(event.ends_at).getTime() < now.getTime()
}

export function isApplicationClosed(event: EventTiming, now = new Date()) {
  return isEventEnded(event, now) || Boolean(event.application_deadline_at && new Date(event.application_deadline_at).getTime() < now.getTime())
}

export function eventStateLabel(event: EventTiming, now = new Date()) {
  if (isEventEnded(event, now)) return "開催終了"
  if (isApplicationClosed(event, now)) return "応募受付終了"
  return "応募受付中"
}

export function createEventSlug(title: string) {
  const normalized = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `${normalized || "event"}-${crypto.randomUUID().slice(0, 8)}`
}

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}
