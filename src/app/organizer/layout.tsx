import RoleShell from "@/components/RoleShell"
import { requireRole } from '@/lib/auth'

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole('organizer')
  return <RoleShell organizerName={profile?.display_name ?? '主催者アカウント'} role="organizer">{children}</RoleShell>
}
