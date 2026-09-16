import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AppRole = "organizer" | "vendor" | "admin"

export async function getCurrentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from("profiles").select("id, role, display_name").eq("id", user.id).maybeSingle()
  return { supabase, user, profile: profile as { id: string; role: AppRole; display_name: string } | null }
}

export async function requireRole(role: "organizer" | "vendor") {
  const session = await getCurrentProfile()
  if (!session.user) redirect("/login")
  if (!session.profile) redirect("/onboarding")
  if (session.profile.role !== role && session.profile.role !== "admin") redirect(session.profile.role === "organizer" ? "/organizer" : "/vendor")
  return session
}

export async function redirectToRoleDashboard() {
  const { user, profile } = await getCurrentProfile()
  if (!user) redirect("/login")
  if (!profile) redirect("/onboarding")
  redirect(profile.role === "organizer" || profile.role === "admin" ? "/organizer" : "/vendor")
}

export async function requireAdmin() {
  const session = await getCurrentProfile()
  if (!session.user) redirect("/login")
  if (session.profile?.role !== "admin") redirect("/dashboard")
  return session
}
