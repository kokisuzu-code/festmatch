import RolePreview from "@/components/developer/RolePreview"

export const metadata = {
  title: "出店者デモ | 開発者ページ",
  description: "FestMatch出店者ワークスペースのログイン不要な公開デモです。",
  robots: { index: false, follow: false },
}

export default function DeveloperVendorPage() {
  return <RolePreview role="vendor" />
}
