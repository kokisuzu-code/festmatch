'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/organizer', label: 'ホーム', symbol: '⌂', exact: true },
  { href: '/organizer/events', label: 'イベント管理', symbol: '□', exact: false },
  { href: '/organizer/applications', label: '応募一覧・承認', symbol: '◎', exact: false },
  { href: '/organizer/genres', label: 'ジャンル枠管理', symbol: '▦', exact: false },
  { href: '/organizer/messages', label: 'メッセージ', symbol: '◇', exact: false },
  { href: '/organizer/reports', label: '売上・実績', symbol: '↗', exact: false },
  { href: '/organizer/settings', label: '料金・契約', symbol: '♢', exact: false },
  { href: '/organizer/ratings', label: '出店者評価', symbol: '☆', exact: false },
] as const

const platformLinks = [
  { href: '/organizer/verification', label: '審査・認証', symbol: '✓', exact: false },
  { href: '/organizer/policies', label: 'ポリシー・補欠', symbol: '↻', exact: false },
] as const

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export default function OrganizerShell({ children, displayName = '主催者アカウント' }: { children: React.ReactNode; displayName?: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const allLinks = [...links, ...platformLinks]
  const activeLink = allLinks.find((link) => isActive(pathname, link.href, link.exact))

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

        <div className="organizer-role-switch" aria-label="利用モード">
          <span className="active">主催者</span>
          <span>出店者</span>
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
              {link.label === '応募一覧・承認' && <small>3</small>}
              {link.label === 'メッセージ' && <small>2</small>}
            </Link>
          ))}
        </nav>

        <nav className="organizer-side-nav organizer-platform-nav" aria-label="プラットフォームメニュー">
          <p>PLATFORM</p>
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
          <span aria-hidden="true">{displayName.slice(0, 2).toUpperCase()}</span>
          <div><strong>{displayName}</strong><small>主催者アカウント</small></div>
          <form action="/auth/signout" method="post"><button aria-label="ログアウト" type="submit">•••</button></form>
        </div>
      </aside>

      {mobileOpen && <button aria-label="メニューを閉じる" className="organizer-mobile-backdrop" onClick={() => setMobileOpen(false)} type="button" />}

      <div className="organizer-workspace">
        <header className="organizer-topbar">
          <div>
            <button aria-label="メニューを開く" onClick={() => setMobileOpen(true)} type="button">☰</button>
            <span>{activeLink?.label ?? '主催者ポータル'}</span>
          </div>
          <div className="organizer-topbar-actions">
            <span className="organizer-db-state">DB接続済み</span>
            <button aria-label="通知" className="organizer-notification" type="button">◇<i /></button>
            <span className="organizer-verified">✓ 認証済み</span>
            <span className="organizer-top-avatar" aria-hidden="true">{displayName.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="organizer-content">{children}</main>
      </div>
    </div>
  )
}
