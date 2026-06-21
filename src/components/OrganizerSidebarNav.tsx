'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    label: 'ホーム',
    href: '/dashboard',
    match: (p: string) => p === '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'イベント',
    href: '/events',
    match: (p: string) => p.startsWith('/events'),
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'チャット',
    href: '/messages',
    match: (p: string) => p.startsWith('/messages'),
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    label: '書類審査',
    href: '/review',
    match: (p: string) => p.startsWith('/review'),
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'プラン',
    href: '/plan',
    match: (p: string) => p.startsWith('/plan'),
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
]

export default function OrganizerSidebarNav({
  nameChar,
  unreadCount = 0,
}: {
  nameChar: string
  unreadCount?: number
}) {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* ロゴ */}
      <div className="px-5 py-4 border-b border-gray-100">
        <span className="text-base font-bold text-gray-900 tracking-tight">FestMatch</span>
        <span className="ml-2 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">主催者</span>
      </div>

      {/* ナビ */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(item => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.href === '/messages' && unreadCount > 0 && (
                <span className="ml-auto text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* フッター */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
          {nameChar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 truncate">主催者アカウント</p>
        </div>
        <Link href="/dev" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">Dev</Link>
      </div>
    </aside>
  )
}
