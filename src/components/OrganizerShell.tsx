'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/organizer', label: 'ダッシュボード', symbol: '⌂', exact: true },
  { href: '/organizer/events', label: 'イベント管理', symbol: '▣', exact: false },
  { href: '/organizer/vendors', label: '出店者管理', symbol: '◎', exact: false },
  { href: '/organizer/settings', label: '設定・契約', symbol: '⚙', exact: false },
] as const

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export default function OrganizerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeLink = links.find((link) => isActive(pathname, link.href, link.exact))

  return (
    <div className="organizer-console organizer-theme">
      <aside className={`organizer-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="organizer-brand-row">
          <Link className="organizer-brand" href="/organizer" onClick={() => setMobileOpen(false)}>
            <span aria-hidden="true">F</span>
            <strong>FestMatch</strong>
          </Link>
          <button aria-label="メニューを閉じる" className="organizer-mobile-close" onClick={() => setMobileOpen(false)} type="button">×</button>
        </div>

        <div className="organizer-role-pill" aria-label="利用モード">
          <span>主催者</span>
        </div>

        <nav className="organizer-side-nav" aria-label="主催者メニュー">
          <p>MENU</p>
          {links.map((link) => (
            <Link
              aria-current={isActive(pathname, link.href, link.exact) ? 'page' : undefined}
              className={isActive(pathname, link.href, link.exact) ? 'active' : ''}
              href={link.href}
              key={link.href}
              onClick={() => setMobileOpen(false)}
            >
              <span aria-hidden="true">{link.symbol}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="organizer-account">
          <span aria-hidden="true">FM</span>
          <div><strong>主催者アカウント</strong><small>Organizer</small></div>
          <form action="/auth/signout" method="post"><button type="submit">ログアウト</button></form>
        </div>
      </aside>

      {mobileOpen && <button aria-label="メニューを閉じる" className="organizer-mobile-backdrop" onClick={() => setMobileOpen(false)} type="button" />}

      <div className="organizer-workspace">
        <header className="organizer-topbar">
          <div>
            <button aria-label="メニューを開く" onClick={() => setMobileOpen(true)} type="button">☰</button>
            <span>{activeLink?.label ?? '主催者ポータル'}</span>
          </div>
          <span className="organizer-verified">✓ 認証済み</span>
        </header>
        <main className="organizer-content">{children}</main>
      </div>
    </div>
  )
}
