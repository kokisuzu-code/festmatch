import OrganizerVendorsPage from '../vendors/page'

export const dynamic = 'force-dynamic'
export const metadata = { title: '応募一覧・承認', description: 'イベントへの応募を確認し、承認や見送りを管理します。' }

export default async function OrganizerApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return OrganizerVendorsPage({ searchParams })
}
