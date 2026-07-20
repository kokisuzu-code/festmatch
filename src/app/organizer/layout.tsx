import RoleShell from "@/components/RoleShell"

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="organizer">{children}</RoleShell>
}
