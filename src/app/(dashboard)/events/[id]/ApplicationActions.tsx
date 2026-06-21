'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DECLINE_REASONS = [
  'ジャンルの定員が満了しました',
  '出店スペースが確保できませんでした',
  '車長・設備要件が条件に合いませんでした',
  'スケジュールの都合により見送りとなりました',
  '今回はご縁がありませんでした',
]

const APPROVE_TEMPLATE = `【出店確定のお知らせ】
ご応募いただきありがとうございます。
審査の結果、出店が確定しました。
詳細についてはこちらのメッセージでご連絡いたします。`

const DECLINE_TEMPLATE = `【応募結果のお知らせ】
ご応募いただきありがとうございます。
慎重に検討した結果、今回は見送りとさせていただきました。
またの機会にぜひご応募ください。`

export default function ApplicationActions({
  applicationId,
  eventId,
  disabled = false,
  disabledReason,
}: {
  applicationId: string
  eventId: string
  disabled?: boolean
  disabledReason?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  // 通知メッセージモーダル
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)

  const sendNotification = async (message: string) => {
    if (!message.trim()) return
    setSendingNotify(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('messages').insert({
        application_id: applicationId,
        sender_id: user.id,
        body: message.trim(),
        media_type: 'text',
      })
    }
    setSendingNotify(false)
  }

  const updateStatus = async (status: 'approved' | 'declined', reason?: string) => {
    setLoading(true)
    await supabase
      .from('applications')
      .update({
        status,
        decided_at: new Date().toISOString(),
        ...(reason ? { decline_reason: reason } : {}),
      })
      .eq('id', applicationId)
    setLoading(false)
    setShowDeclineModal(false)

    // 通知モーダルを開く
    setNotifyMessage(status === 'approved' ? APPROVE_TEMPLATE : DECLINE_TEMPLATE)
    setShowNotifyModal(true)
  }

  const handleDeclineConfirm = () => {
    const reason = selectedReason === 'custom' ? customReason : selectedReason
    updateStatus('declined', reason || undefined)
  }

  const handleNotifySend = async () => {
    await sendNotification(notifyMessage)
    setShowNotifyModal(false)
    router.refresh()
  }

  const handleNotifySkip = () => {
    setShowNotifyModal(false)
    router.refresh()
  }

  if (disabled) {
    return (
      <div className="flex gap-2">
        <button disabled className="flex-1 text-xs px-3 py-1.5 border border-red-200 text-red-400 rounded-lg opacity-50 cursor-not-allowed">
          見送る
        </button>
        <button disabled className="flex-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
          {disabledReason ?? '承認不可'}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowDeclineModal(true)}
          disabled={loading}
          className="flex-1 text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          見送る
        </button>
        <button
          onClick={() => updateStatus('approved')}
          disabled={loading}
          className="flex-1 text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? '処理中...' : '承認して確定'}
        </button>
      </div>

      {/* 見送り理由モーダル */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowDeclineModal(false)}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">見送り理由を選択</h3>
            <p className="text-xs text-gray-400 mb-4">内部メモ用。出店者には通知メッセージで別途連絡します。</p>

            <div className="space-y-2 mb-4">
              {DECLINE_REASONS.map(reason => (
                <label key={reason} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="decline_reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="w-3.5 h-3.5 text-gray-700"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{reason}</span>
                </label>
              ))}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="decline_reason"
                  value="custom"
                  checked={selectedReason === 'custom'}
                  onChange={() => setSelectedReason('custom')}
                  className="w-3.5 h-3.5 text-gray-700"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">その他（自由記述）</span>
              </label>
              {selectedReason === 'custom' && (
                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="理由を入力"
                  rows={2}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 text-sm border border-gray-200 text-gray-500 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeclineConfirm}
                disabled={loading}
                className="flex-1 text-sm bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? '処理中...' : '見送りを確定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通知メッセージモーダル */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">出店者へ通知を送る</h3>
            <p className="text-xs text-gray-400 mb-3">内容を編集して送信できます</p>

            <textarea
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={handleNotifySkip}
                className="flex-1 text-sm border border-gray-200 text-gray-500 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                スキップ
              </button>
              <button
                onClick={handleNotifySend}
                disabled={sendingNotify || !notifyMessage.trim()}
                className="flex-1 text-sm bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {sendingNotify ? '送信中...' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
