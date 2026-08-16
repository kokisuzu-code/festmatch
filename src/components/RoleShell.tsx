import OrganizerShell from '@/components/OrganizerShell'
import VendorShell from '@/components/VendorShell'


export default function RoleShell({ role, children, organizerName }: { role: "organizer" | "vendor"; children: React.ReactNode; organizerName?: string }) {
  if (role === 'organizer') return <OrganizerShell displayName={organizerName}>{children}</OrganizerShell>
  return <VendorShell>{children}</VendorShell>
}
