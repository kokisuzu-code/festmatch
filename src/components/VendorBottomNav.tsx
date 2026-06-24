'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function VendorBottomNav() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 自分のキッチンカーの応募IDを取得
      const { data: myCars } = await supabase
        .from('vendors')
        .select('id')
        .eq('owner_id', user.id)

      const carIds = myCars?.map((c: any) => c.id) ?? []
      if (!carIds.length) return

      const { data: apps } = await supabase
        .from('applications')
        .select('id')
        .in('vendor_id', carIds)

      const appIds = apps?.map((a: any) => a.id) ?? []
      if (!appIds.length) return

      // 各会話の最新メッセージを取得
      const { data: messages } = await supabase
        .from('messages')
        .select('application_id, sender_id, created_at')
        .in('application_id', appIds)
        .order('created_at', { ascending: false })

      if (!messages) return

      // 会話ごとの最新メッセージ
      const lastMsgMap: Record<string, string> = {}
      for (const msg of messages) {
        if (!lastMsgMap[msg.application_id]) {
          lastMsgMap[msg.application_id] = msg.sender_id
        }
      }

      // 自分以外が最後に送った会話数 = 未読数
      const count = Object.values(lastMsgMap).filter(sid => sid !== user.id).length
      setUnreadCount(count)
    }

    fetchUnread()

    // リアルタイム更新
    const supabaseClient = createClient()
    const channel = supabaseClient
      .channel('vendor-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchUnread()
      })
      .subscribe()

    return () => { supabaseClient.removeChannel(channel) }
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex z-50">
      <Link href="/browse" className={`flex-1 flex flex-col items-center py-3 gap-1 ${isActive('/browse') ? 'text-green-400' : 'text-slate-500'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs">探す</span>
      </Link>
      <Link href="/schedule" className={`flex-1 flex flex-col items-center py-3 gap-1 ${isActive('/schedule') ? 'text-green-400' : 'text-slate-500'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs">スケジュール</span>
      </Link>
      <Link href="/my-sales" className={`flex-1 flex flex-col items-center py-3 gap-1 ${isActive('/my-sales') ? 'text-green-400' : 'text-slate-500'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-xs">売上</span>
      </Link>
      <Link href="/messages" className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${isActive('/messages') ? 'text-green-400' : 'text-slate-500'}`}>
        <span className="relative">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span className={`text-xs ${isActive('/messages') ? 'font-medium' : ''}`}>チャット</span>
      </Link>
      <Link href="/dashboard" className={`flex-1 flex flex-col items-center py-3 gap-1 ${isActive('/dashboard') ? 'text-green-400' : 'text-slate-500'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs">マイページ</span>
      </Link>
    </nav>
  )
}
