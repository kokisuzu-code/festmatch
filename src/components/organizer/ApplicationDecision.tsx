'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignEventSpace, decideApplication } from '@/app/organizer/events/actions'

type Space = { id: string; label: string; genre: string | null; assigned_application_id: string | null }

export default function ApplicationDecision({
  eventId,
  applicationId,
  status,
  vendorGenre,
  spaces,
  assignedSpaceId,
  genreSlotFull,
}: {
  eventId: string
  applicationId: string
  status: string
  vendorGenre: string | null
  spaces: Space[]
  assignedSpaceId: string | null
  genreSlotFull: boolean
}) {
  const router = useRouter()
  const [selectedSpaceId, setSelectedSpaceId] = useState(assignedSpaceId ?? '')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const compatibleSpaces = spaces.filter((space) => (!space.genre || space.genre === vendorGenre) && (!space.assigned_application_id || space.assigned_application_id === applicationId))
  const requiresSpace = spaces.length > 0

  function decide(next: 'approved' | 'rejected') {
    setMessage('')
    startTransition(async () => {
      try {
        await decideApplication(applicationId, next, next === 'approved' ? selectedSpaceId || undefined : undefined)
        setMessage(next === 'approved' ? '承認しました。' : '見送りました。')
        router.refresh()
      } catch {
        setMessage(next === 'approved' ? '承認または区画割当ができませんでした。' : '更新できませんでした。')
      }
    })
  }

  function saveAssignment() {
    setMessage('')
    startTransition(async () => {
      try {
        await assignEventSpace(eventId, applicationId, selectedSpaceId || null)
        setMessage('区画を更新しました。')
        router.refresh()
      } catch {
        setMessage('区画を更新できませんでした。')
      }
    })
  }

  if (status !== 'pending') {
    if ((status !== 'approved' && status !== 'paid') || !spaces.length) return <span className="status">{status}</span>
    return <div className="decision-actions assignment-control"><span className="status">{status}</span><label>区画<select value={selectedSpaceId} disabled={pending} onChange={(event) => setSelectedSpaceId(event.target.value)}><option value="">未割当</option>{compatibleSpaces.map((space) => <option key={space.id} value={space.id}>{space.label}{space.genre ? `（${space.genre}）` : ''}</option>)}</select></label><button className="button button-secondary" disabled={pending} aria-busy={pending} onClick={saveAssignment}>{pending ? '保存中…' : '区画を保存'}</button>{message && <small>{message}</small>}</div>
  }

  return <div className="decision-actions">
    {genreSlotFull && <small className="slot-full-note">ジャンル枠が満了しているため承認できません。</small>}
    {requiresSpace && <label>割当区画<select value={selectedSpaceId} disabled={pending} onChange={(event) => setSelectedSpaceId(event.target.value)}><option value="">区画を選択</option>{compatibleSpaces.map((space) => <option key={space.id} value={space.id}>{space.label}{space.genre ? `（${space.genre}）` : ''}</option>)}</select></label>}
    {requiresSpace && !compatibleSpaces.length && <small className="slot-full-note">割り当て可能な空き区画がありません。</small>}
    <button className="button button-secondary" disabled={pending} aria-busy={pending} onClick={() => decide('rejected')}>{pending ? '処理中…' : '見送る'}</button>
    <button className="button button-primary" disabled={pending || genreSlotFull || (requiresSpace && (!selectedSpaceId || !compatibleSpaces.length))} aria-busy={pending} onClick={() => decide('approved')}>{pending ? '処理中…' : '承認'}</button>
    {message && <small>{message}</small>}
  </div>
}
