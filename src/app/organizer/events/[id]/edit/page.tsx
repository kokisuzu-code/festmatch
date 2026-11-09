import BoothManagement from "@/components/bidding/BoothManagement"
import { getBoothBidding, boothMapUrl } from "@/lib/booth-bidding-server"
import { notFound } from "next/navigation"
import EventForm from "@/components/organizer/EventForm"
import { updateEvent } from "@/app/organizer/events/actions"
import { requireRole } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "イベントを編集", description: "FestMatchのイベント情報を編集します。" }

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await requireRole("organizer")
  const [{ data: event }, { data: slots }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from('event_genre_slots').select('id, genre, capacity').eq('event_id', id).order('genre'),
  ])
  if (!event) notFound()
  const { data: organizer } = await supabase.from('organizers').select('id').eq('profile_id', user.id).maybeSingle()
  if (!organizer || event.organizer_id !== organizer.id) notFound()
  const bidding = await getBoothBidding(id)
  const { count: appCount } = await supabase.from('applications').select('id', { count: 'exact', head: true }).eq('event_id', id)
  return <div className="dashboard-stack"><EventForm event={event} previewSlots={slots ?? []} action={updateEvent.bind(null, id)} hasApplications={Boolean(appCount || bidding.bids.length)} recruitmentEditor={<><BoothManagement key={event.booth_config_version} event={event} spaces={bidding.spaces} slots={slots ?? []} bids={bidding.bids} mapUrl={boothMapUrl(event.booth_map_path)} names={{}} mode="setup" hasApplications={Boolean(appCount)} aiEnabled={Boolean(process.env.OPENAI_API_KEY)} /></>} /></div>
}
