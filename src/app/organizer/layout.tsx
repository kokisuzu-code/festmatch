import RoleShell from "@/components/RoleShell"
import { requireRole } from '@/lib/auth'

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase, user } = await requireRole('organizer')
  const { data: grant } = await supabase.from('site_editors').select('user_id').eq('user_id', user.id).maybeSingle()
  return <RoleShell canEditSite={Boolean(grant)} organizerName={profile?.display_name ?? '主催者アカウント'} role="organizer">{children}</RoleShell>
}
