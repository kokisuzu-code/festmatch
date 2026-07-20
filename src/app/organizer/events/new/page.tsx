import EventForm from "@/components/organizer/EventForm"
import { createEvent } from "@/app/organizer/events/actions"
import { requireRole } from "@/lib/auth"

export const metadata = { title: "イベントを作成", description: "FestMatchで新しいイベントの出店募集を作成します。" }

export default async function NewEventPage() {
  await requireRole("organizer")
  return <EventForm action={createEvent} />
}
