import OrganizerVendorsPage from '../vendors/page'

export const dynamic = 'force-dynamic'
export const metadata = { title: '出店者評価', description: '出店者の実績と取引状況を確認します。' }

export default async function OrganizerRatingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return OrganizerVendorsPage({ searchParams })
}
