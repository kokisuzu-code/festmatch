import RolePreview from "@/components/developer/RolePreview"

export const metadata = {
  title: "主催者デモ | 開発者ページ",
  description: "FestMatch主催者ワークスペースのログイン不要な公開デモです。",
  robots: { index: false, follow: false },
}

export default function DeveloperOrganizerPage() {
  return <RolePreview role="organizer" />
}
