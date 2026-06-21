'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  sender_id: string
  body: string
  media_url?: string | null
  media_type?: string | null
  created_at: string
  profiles?: { name: string } | null
}

const TEMPLATES = {
  organizer: [
    'ご応募ありがとうございます！内容を確認してご連絡いたします。',
    '承認いたしました。当日は◯番スペースにお越しください。',
    '電源・水道の使用について、当日スタッフにお声がけください。',
    '搬入は開場の2時間前（◯時）からお願いします。',
    'ご質問があればお気軽にメッセージください。',
  ],
  vendor: [
    'ご検討よろしくお願いいたします。',
    '承認いただきありがとうございます！当日よろしくお願いします。',
    '車長は約◯mです。電源は使用予定があります。',
    '搬入時刻・駐車場の場所を教えていただけますか？',
    '当日の天気が心配ですが、雨天でも出店可能でしょうか？',
  ],
}

const MAX_IMAGE_MB = 10
const MAX_VIDEO_MB = 50

export default function ChatWindow({
  applicationId,
  userId,
  initialMessages,
  isOrganizer,
  applicationStatus,
}: {
  applicationId: string
  userId: string
  initialMessages: Message[]
  isOrganizer: boolean
  applicationStatus?: string
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video'; file: File } | null>(null)
  const pendingIds = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => { scrollToBottom() }, [messages])

  // Realtimeサブスクリプション
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${applicationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `application_id=eq.${applicationId}`,
      }, async (payload) => {
        const newId = payload.new.id as string
        if (pendingIds.current.has(newId)) {
          pendingIds.current.delete(newId)
          return
        }
        const { data: profile } = await supabase
          .from('profiles').select('name').eq('id', payload.new.sender_id).single()
        setMessages(prev => {
          if (prev.some(m => m.id === newId)) return prev
          return [...prev, { ...(payload.new as Message), profiles: profile }]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [applicationId, supabase])

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      alert('画像または動画ファイルを選択してください')
      return
    }
    if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(`画像は${MAX_IMAGE_MB}MB以下にしてください`)
      return
    }
    if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      alert(`動画は${MAX_VIDEO_MB}MB以下にしてください`)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview({ url, type: isImage ? 'image' : 'video', file })
    // input リセット
    e.target.value = ''
  }

  // メディアアップロード＆送信
  const sendMedia = async () => {
    if (!preview || sending) return
    setSending(true)
    setUploadProgress('アップロード中...')

    const { file, type } = preview
    const ext = file.name.split('.').pop()
    const path = `${applicationId}/${Date.now()}.${ext}`

    const { data: uploaded, error: uploadErr } = await supabase.storage
      .from('chat-media')
      .upload(path, file, { upsert: false })

    if (uploadErr) {
      alert('アップロードに失敗しました: ' + uploadErr.message)
      setSending(false)
      setUploadProgress(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(uploaded.path)

    setUploadProgress('送信中...')

    const tempId = crypto.randomUUID()
    const optimistic: Message = {
      id: tempId,
      sender_id: userId,
      body: '',
      media_url: preview.url, // ローカルURLで先に表示
      media_type: type,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setPreview(null)
    URL.revokeObjectURL(preview.url)

    const { data, error } = await supabase
      .from('messages')
      .insert({
        application_id: applicationId,
        sender_id: userId,
        body: '',
        media_url: publicUrl,
        media_type: type,
      })
      .select('id').single()

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else if (data) {
      pendingIds.current.add(data.id)
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...m, id: data.id, media_url: publicUrl } : m)
      )
    }

    setSending(false)
    setUploadProgress(null)
  }

  // テキスト送信
  const sendMessage = async (text?: string) => {
    const content = (text ?? body).trim()
    if (!content || sending) return
    setSending(true)
    setShowTemplates(false)

    const tempId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: tempId, sender_id: userId, body: content,
      created_at: new Date().toISOString(), profiles: null,
    }])
    setBody('')

    const { data, error } = await supabase
      .from('messages')
      .insert({ application_id: applicationId, sender_id: userId, body: content })
      .select('id').single()

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setBody(content)
    } else if (data) {
      pendingIds.current.add(data.id)
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m))
    }

    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })

  const grouped: { date: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  }

  const templates = isOrganizer ? TEMPLATES.organizer : TEMPLATES.vendor

  return (
    <>
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm mb-2">メッセージを送って会話を始めましょう</p>
            <p className="text-xs text-slate-500">↓ テンプレートが参考になります</p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500">{group.date}</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
            <div className="space-y-2">
              {group.messages.map(msg => {
                const isMine = msg.sender_id === userId
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && msg.profiles?.name && (
                        <span className="text-xs text-slate-400 px-1">{msg.profiles.name}</span>
                      )}

                      {/* 画像 */}
                      {msg.media_type === 'image' && msg.media_url && (
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.media_url}
                            alt="送信画像"
                            className="rounded-2xl max-w-[240px] max-h-[320px] object-cover border border-slate-700"
                          />
                        </a>
                      )}

                      {/* 動画 */}
                      {msg.media_type === 'video' && msg.media_url && (
                        <video
                          src={msg.media_url}
                          controls
                          className="rounded-2xl max-w-[280px] border border-slate-700"
                          preload="metadata"
                        />
                      )}

                      {/* テキスト */}
                      {msg.body && (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isMine
                            ? 'bg-green-600 text-white rounded-br-sm'
                            : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-sm'
                        }`}>
                          {msg.body}
                        </div>
                      )}

                      <span className="text-xs text-slate-500 px-1">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* テンプレート */}
      {showTemplates && (
        <div className="bg-slate-900 border-t border-slate-700 px-3 py-3 space-y-2 shrink-0">
          <p className="text-xs text-slate-400 font-medium px-1">よく使うメッセージ</p>
          {templates.map((t, i) => (
            <button key={i} onClick={() => { setBody(t); setShowTemplates(false); inputRef.current?.focus() }}
              className="w-full text-left text-sm text-slate-200 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 hover:border-green-400 hover:bg-green-950/40 transition-colors">
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 送信前プレビュー */}
      {preview && !(!isOrganizer && applicationStatus === 'declined') && (
        <div className="bg-slate-900 border-t border-slate-700 px-4 py-3 shrink-0">
          <div className="flex items-start gap-3">
            {preview.type === 'image' ? (
              <img src={preview.url} alt="preview" className="w-20 h-20 object-cover rounded-xl" />
            ) : (
              <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-100">
                {preview.type === 'image' ? '📷 画像' : '🎬 動画'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{preview.file.name}</p>
              <p className="text-xs text-slate-500">
                {(preview.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button onClick={() => setPreview(null)} className="text-slate-500 hover:text-red-400 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            onClick={sendMedia}
            disabled={sending}
            className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            {uploadProgress ?? '送信する'}
          </button>
        </div>
      )}

      {/* 入力エリア */}
      {!isOrganizer && applicationStatus === 'declined' ? (
        <div className="bg-slate-900 border-t border-slate-700 px-4 py-4 text-center shrink-0">
          <p className="text-xs text-slate-500">このチャットは終了しました</p>
        </div>
      ) : (
      <div className="bg-slate-800 border-t border-slate-700 px-3 py-3 flex items-end gap-2 shrink-0">
        {/* テンプレート */}
        <button onClick={() => setShowTemplates(v => !v)}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            showTemplates ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-700'
          }`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        {/* ファイル添付 */}
        <button onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-slate-700 text-slate-400 hover:bg-slate-700 flex items-center justify-center shrink-0 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <textarea
          ref={inputRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          rows={1}
          className="flex-1 border border-slate-600 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none max-h-32"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!body.trim() || sending}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-colors">
          <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
      )}
    </>
  )
}
