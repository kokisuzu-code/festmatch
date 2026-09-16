'use client'

import { FormEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendChatMessage } from '@/app/chat/actions'

export type ChatMessage = {
  id: string
  body: string
  created_at: string
  isMine: boolean
}

export default function ChatPanel({
  threadId,
  messages,
  canPost,
}: {
  threadId: string
  messages: ChatMessage[]
  canPost: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    startTransition(async () => {
      try {
        await sendChatMessage(threadId, body)
        setBody('')
        router.refresh()
      } catch {
        setNotice('メッセージを送信できませんでした。')
      }
    })
  }

  return <div className="chat-panel">
    <div className="chat-message-list" aria-live="polite">
      {messages.length ? messages.map((message) => <article className={`chat-message ${message.isMine ? 'chat-message-mine' : ''}`} key={message.id}><p>{message.body}</p><time dateTime={message.created_at}>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.created_at))}</time></article>) : <div className="empty-state"><h2>メッセージはまだありません</h2><p>{canPost ? '最初のメッセージを送信できます。' : '主催者からのお知らせをお待ちください。'}</p></div>}
    </div>
    {canPost ? <form className="chat-composer" onSubmit={send}><label htmlFor="chat-body">メッセージ<textarea id="chat-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={4} placeholder="メッセージを入力" required disabled={pending} /></label><div><small>{body.length} / 4,000</small><button className="button button-primary" disabled={pending || !body.trim()} aria-busy={pending}>{pending ? '送信中…' : '送信'}</button></div>{notice && <p className="form-message">{notice}</p>}</form> : <div className="chat-read-only"><p>このお知らせには返信できません。</p><button type="button" className="button button-secondary" onClick={() => router.refresh()}>最新表示</button></div>}
  </div>
}
