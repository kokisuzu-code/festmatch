import { redirectToRoleDashboard } from '@/lib/auth'

// Legacy dashboard routes are retained only to avoid broken links. They must
// never be rendered as an alternate authorization surface.
export default async function LegacyDashboardLayout({ children }: { children: React.ReactNode }) {
  await redirectToRoleDashboard()
  return children
}
