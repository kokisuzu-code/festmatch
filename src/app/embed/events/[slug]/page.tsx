import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isApplicationClosed } from "@/lib/events"
import AnonymousApplicationForm from "@/components/public/AnonymousApplicationForm"

export const dynamic = "force-dynamic"

export default async function EmbedEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient(); const { data: event } = await supabase.from("events").select("id, title, starts_at, ends_at, application_deadline_at, status").eq("slug", (await params).slug).eq("status", 'published').maybeSingle()
  if (!event) notFound()
  return <main className="embed-page">{isApplicationClosed(event) ? <section className="claim-card"><h1>{event.title}</h1><p>このイベントの応募受付は終了しました。</p></section> : <AnonymousApplicationForm eventId={event.id} title={event.title} />}</main>
}
