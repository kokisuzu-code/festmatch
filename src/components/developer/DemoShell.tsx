import type { ReactNode } from "react"
import BrandMark from "@/components/BrandMark"
import styles from "./DemoShell.module.css"

export default function DemoShell({ navigation, children }: { navigation: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.bar}>
          <BrandMark />
          <nav aria-label="デモのナビゲーション">{navigation}</nav>
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
