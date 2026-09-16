import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isApplicationClosed } from "@/lib/events"
import AnonymousApplicationForm from "@/components/public/AnonymousApplicationForm"
import ApplyButton from "@/components/vendor/ApplyButton"

export const dynamic = "force-dynamic"
export const metadata = { title: "イベントへ応募", description: "FestMatchでイベントへの出店応募を行います。" }

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient(); const { data: event } = await supabase.from("events").select("id, title, starts_at, ends_at, application_deadline_at, status").eq("slug", (await params).slug).eq("status", 'published').maybeSingle()
  if (!event) notFound()
  const { data: { user } } = await supabase.auth.getUser(); const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null }
  const closed = isApplicationClosed(event)
  return <main className="public-apply-page">{closed ? <section className="claim-card"><h1>{event.title}</h1><p>このイベントの応募受付は終了しました。</p></section> : profile?.role === "vendor" ? <section className="public-apply-form"><h1>{event.title} に応募</h1><ApplyButton eventId={event.id} closed={false} /></section> : <AnonymousApplicationForm eventId={event.id} title={event.title} />}</main>
}
