'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { openBroadcastChat, openDirectChat } from '@/app/chat/actions'

export function OpenDirectChatButton({ eventId, vendorId, href }: { eventId: string; vendorId: string; href: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return <div className="chat-open-control"><button className="button button-secondary" disabled={pending} onClick={() => { setError(''); startTransition(async () => { try { const threadId = await openDirectChat(eventId, vendorId); router.push(`${href}/${threadId}`) } catch { setError('チャットを開けませんでした。承認状態を確認してください。') } }) }}>{pending ? '準備中' : '個別チャットを開く'}</button>{error && <small>{error}</small>}</div>
}

export function OpenBroadcastChatButton({ eventId, href }: { eventId: string; href: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return <div className="chat-open-control"><button className="button button-primary" disabled={pending} onClick={() => { setError(''); startTransition(async () => { try { const threadId = await openBroadcastChat(eventId); router.push(`${href}/${threadId}`) } catch { setError('お知らせを開けませんでした。') } }) }}>{pending ? '準備中' : '参加者全員へお知らせ'}</button>{error && <small>{error}</small>}</div>
}
