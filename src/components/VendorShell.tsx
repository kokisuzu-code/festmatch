'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const menuLinks = [
  { href: '/vendor', label: 'ホーム', symbol: '⌂', exact: true },
  { href: '/vendor/events', label: 'イベントを探す', symbol: '□', exact: false },
  { href: '/vendor/applications', label: '応募状況', symbol: '◎', exact: false },
  { href: '/vendor/messages', label: 'メッセージ', symbol: '◇', exact: false },
  { href: '/vendor/sales', label: '売上記録', symbol: '↗', exact: false },
] as const

const platformLinks = [
  { href: '/vendor/settings', label: 'プロフィール・契約', symbol: '☆', exact: false },
  { href: '/home', label: '公式HPを見る', symbol: '↗', exact: true },
] as const

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export default function VendorShell({
  children,
  displayName = '出店者アカウント',
}: {
  children: React.ReactNode
  displayName?: string
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const allLinks = [...menuLinks, ...platformLinks]
  const activeLink = allLinks.find((link) => isActive(pathname, link.href, link.exact))
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="organizer-console vendor-console">
      <aside className={`organizer-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="organizer-brand-row">
          <Link className="organizer-brand" href="/vendor" onClick={() => setMobileOpen(false)}>
            <span aria-hidden="true">F</span>
            <strong>FestMatch</strong>
          </Link>
          <button aria-label="メニューを閉じる" className="organizer-mobile-close" onClick={() => setMobileOpen(false)} type="button">×</button>
        </div>

        <div className="organizer-role-switch" aria-label="利用モード">
          <span>主催者</span>
          <span className="active">出店者</span>
        </div>

        <nav className="organizer-side-nav" aria-label="出店者メニュー">
          <p>MENU</p>
          {menuLinks.map((link) => (
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

        <nav className="organizer-side-nav organizer-platform-nav" aria-label="アカウントメニュー">
          <p>ACCOUNT</p>
          {platformLinks.map((link) => (
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
          <span aria-hidden="true">{initials}</span>
          <div><strong>{displayName}</strong><small>出店者アカウント</small></div>
          <form action="/auth/signout" method="post"><button aria-label="ログアウト" type="submit">•••</button></form>
        </div>
      </aside>

      {mobileOpen && <button aria-label="メニューを閉じる" className="organizer-mobile-backdrop" onClick={() => setMobileOpen(false)} type="button" />}

      <div className="organizer-workspace">
        <header className="organizer-topbar">
          <div>
            <button aria-label="メニューを開く" onClick={() => setMobileOpen(true)} type="button">☰</button>
            <span>{activeLink?.label ?? '出店者ポータル'}</span>
          </div>
          <div className="organizer-topbar-actions">
            <span className="organizer-db-state">DB接続済み</span>
            <button aria-label="通知" className="organizer-notification" type="button">◇<i /></button>
            <span className="organizer-verified">✓ 登録済み</span>
            <span className="organizer-top-avatar" aria-hidden="true">{initials}</span>
          </div>
        </header>
        <main className="organizer-content">{children}</main>
      </div>
    </div>
  )
}
