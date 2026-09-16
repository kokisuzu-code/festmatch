'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export type ManagedVendor = {
  applicationId: string
  vendorId: string
  name: string
  slug: string | null
  genre: string
  prefecture: string | null
  eventId: string
  eventTitle: string
  eventDate: string | null
  status: string
  appliedAt: string
  spaceLabel: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: '審査待ち',
  approved: '承認済み',
  paid: '決済済み',
  rejected: '見送り',
  cancelled: 'キャンセル',
}

function formatDate(value: string | null) {
  if (!value) return '日程未設定'
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

export default function VendorManagementClient({
  vendors,
  events,
  initialStatus,
}: {
  vendors: ManagedVendor[]
  events: { id: string; title: string }[]
  initialStatus: string
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [eventId, setEventId] = useState('all')

  const counts = useMemo(() => ({
    all: vendors.length,
    pending: vendors.filter((vendor) => vendor.status === 'pending').length,
    approved: vendors.filter((vendor) => vendor.status === 'approved').length,
    paid: vendors.filter((vendor) => vendor.status === 'paid').length,
  }), [vendors])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ja')
    return vendors.filter((vendor) => {
      const matchesQuery = !needle || [vendor.name, vendor.genre, vendor.eventTitle, vendor.prefecture ?? '']
        .some((value) => value.toLocaleLowerCase('ja').includes(needle))
      const matchesStatus = status === 'all' || vendor.status === status
      const matchesEvent = eventId === 'all' || vendor.eventId === eventId
      return matchesQuery && matchesStatus && matchesEvent
    })
  }, [eventId, query, status, vendors])

  return (
    <>
      <section className="vendor-summary-grid" aria-label="ベンダーの集計">
        <button className={status === 'all' ? 'vendor-summary-card selected' : 'vendor-summary-card'} type="button" onClick={() => setStatus('all')}>
          <span>応募ベンダー</span><strong>{counts.all}</strong><small>すべてのステータス</small>
        </button>
        <button className={status === 'pending' ? 'vendor-summary-card needs-action selected' : 'vendor-summary-card needs-action'} type="button" onClick={() => setStatus('pending')}>
          <span>審査待ち</span><strong>{counts.pending}</strong><small>対応が必要</small>
        </button>
        <button className={status === 'approved' ? 'vendor-summary-card selected' : 'vendor-summary-card'} type="button" onClick={() => setStatus('approved')}>
          <span>承認済み</span><strong>{counts.approved}</strong><small>決済待ちを含む</small>
        </button>
        <button className={status === 'paid' ? 'vendor-summary-card selected' : 'vendor-summary-card'} type="button" onClick={() => setStatus('paid')}>
          <span>決済完了</span><strong>{counts.paid}</strong><small>出店確定</small>
        </button>
      </section>

      <section className="panel vendor-management-panel">
        <div className="section-heading vendor-management-heading">
          <div>
            <p className="eyebrow">ALL VENDORS</p>
            <h2>ベンダー一覧</h2>
          </div>
          <span>{filtered.length}件を表示</span>
        </div>

        <div className="vendor-filter-bar">
          <label className="vendor-search">
            <span className="sr-only">ベンダーを検索</span>
            <i aria-hidden="true">⌕</i>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="屋号、ジャンル、地域で検索" />
          </label>
          <label>
            <span className="sr-only">ステータスで絞り込む</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">すべてのステータス</option>
              <option value="pending">審査待ち</option>
              <option value="approved">承認済み</option>
              <option value="paid">決済済み</option>
              <option value="rejected">見送り</option>
              <option value="cancelled">キャンセル</option>
            </select>
          </label>
          <label>
            <span className="sr-only">イベントで絞り込む</span>
            <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
              <option value="all">すべてのイベント</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </label>
        </div>

        {filtered.length ? (
          <div className="vendor-table" role="table" aria-label="ベンダー一覧">
            <div className="vendor-table-head" role="row">
              <span role="columnheader">ベンダー</span>
              <span role="columnheader">イベント</span>
              <span role="columnheader">区画</span>
              <span role="columnheader">ステータス</span>
              <span role="columnheader">操作</span>
            </div>
            {filtered.map((vendor) => (
              <article className="vendor-table-row" role="row" key={vendor.applicationId}>
                <div className="vendor-identity" role="cell">
                  <span className="vendor-avatar" aria-hidden="true">{vendor.name.slice(0, 1)}</span>
                  <span>
                    <strong>{vendor.name}</strong>
                    <small>{vendor.genre}{vendor.prefecture ? `・${vendor.prefecture}` : ''}</small>
                  </span>
                </div>
                <div className="vendor-event-cell" role="cell">
                  <strong>{vendor.eventTitle}</strong>
                  <small>{formatDate(vendor.eventDate)}・応募 {formatDate(vendor.appliedAt)}</small>
                </div>
                <div className="vendor-space-cell" role="cell">
                  <strong>{vendor.spaceLabel ?? '未割当'}</strong>
                  <small>{vendor.spaceLabel ? '区画確定' : '確認が必要'}</small>
                </div>
                <div role="cell">
                  <span className={`vendor-status vendor-status-${vendor.status}`}>
                    {STATUS_LABELS[vendor.status] ?? vendor.status}
                  </span>
                </div>
                <div className="vendor-row-actions" role="cell">
                  {vendor.slug && <Link href={`/festmap/vendors/${vendor.slug}`}>プロフィール</Link>}
                  <Link href={`/organizer/events/${vendor.eventId}#application-${vendor.applicationId}`}>
                    {vendor.status === 'pending' ? '審査する' : '詳細'}
                  </Link>
                  {(vendor.status === 'approved' || vendor.status === 'paid') && (
                    <Link className="primary" href={`/organizer/events/${vendor.eventId}/chat`}>連絡</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>条件に合うベンダーがいません</h3>
            <p>検索条件または絞り込みを変更してください。</p>
            <button className="button button-secondary" type="button" onClick={() => { setQuery(''); setStatus('all'); setEventId('all') }}>
              絞り込みを解除
            </button>
          </div>
        )}
      </section>
    </>
  )
}
