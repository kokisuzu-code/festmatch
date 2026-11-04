import OrganizerShell from '@/components/OrganizerShell'
import VendorShell from '@/components/VendorShell'


export default function RoleShell({ role, children, organizerName, canEditSite = false }: { role: "organizer" | "vendor"; children: React.ReactNode; organizerName?: string; canEditSite?: boolean }) {
  if (role === 'organizer') return <OrganizerShell displayName={organizerName} canEditSite={canEditSite}>{children}</OrganizerShell>
  return <VendorShell>{children}</VendorShell>
}
