'use client'

import { useState } from 'react'
import { useEventOperations } from '@/components/useEventOperations'
import { CHECK_KINDS, CHECK_STATES, STALL_STATUS, formatOperationDate } from '@/lib/event-operations'
import { OpenDirectChatButton } from '@/components/chat/OpenChatButton'

export default function VendorDayOperations({ eventId }: { eventId: string }) {
  const { data, error, busy, loading, refresh, mutate } = useEventOperations(eventId)
  const [report, setReport] = useState('')
  const [notice, setNotice] = useState('')
  const app = data?.applications[0]
  const state = data?.states.find(item => item.application_id === app?.id)
  return <div className="dashboard-stack">
    {error && <p className="form-message" role="alert">{error}</p>}
    <div className="button-row"><button className="button button-secondary" disabled={busy} onClick={() => void refresh()}>最新表示</button><p role="status">{busy ? '保存中…' : notice}</p></div>
    {loading && <p role="status">当日の情報を読み込み中…</p>}
    {data && app && <>
      <section className="panel vendor-day-panel"><div className="section-heading"><div><h2>{data.event.title}</h2><p>{formatOperationDate(data.event.starts_at)} ・ {app.label}</p></div><OpenDirectChatButton eventId={eventId} vendorId={app.vendor_id} href="/vendor/messages" /></div><label className="vendor-day-field">現在の状況<select disabled={busy} value={state?.status ?? 'unknown'} onChange={async e => { if (await mutate({ command: 'stall', payload: { application_id: app.id, status: e.target.value as keyof typeof STALL_STATUS, version: state?.version ?? 0 } })) setNotice('主催者へ状況を共有しました。') }}>{Object.entries(STALL_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{data.mapUrl && <a className="button button-secondary" href={data.mapUrl} target="_blank" rel="noopener noreferrer">会場図を開く</a>}</section>
      <section className="panel vendor-day-panel"><h2>主催者からのお知らせ</h2>{data.announcements.map(item => { const receipt = data.receipts.find(row => row.announcement_id === item.id); return <article key={item.id} className="vendor-day-notice"><time>{formatOperationDate(item.created_at)}</time><p>{item.body}</p><button className="button button-secondary" disabled={busy || !receipt || Boolean(item.requires_ack ? receipt?.acknowledged_at : receipt?.read_at)} onClick={async () => { if (await mutate({ command: 'receipt', payload: { announcement_id: item.id, acknowledge: item.requires_ack } })) setNotice('確認状況を主催者へ共有しました。') }}>{!receipt ? '参加承認前のお知らせ' : item.requires_ack ? receipt?.acknowledged_at ? '確認回答済み' : '内容を確認しました' : receipt?.read_at ? '閲覧済み' : '閲覧済みにする'}</button></article> })}{!data.announcements.length && <p>お知らせはまだありません。</p>}</section>
      <section className="panel vendor-day-panel"><h2>出店前・撤収時の自己確認</h2>{Object.entries(CHECK_KINDS).map(([kind, label]) => { const own = data.checks.find(item => item.application_id === app.id && item.kind === kind && item.source === 'self'); const organizer = data.checks.find(item => item.application_id === app.id && item.kind === kind && item.source === 'organizer'); return <label key={kind} className="vendor-day-field"><span>{label}<small>主催者確認：{CHECK_STATES[organizer?.state ?? 'pending']}</small></span><select disabled={busy} value={own?.state ?? 'pending'} onChange={async e => { if (await mutate({ command: 'check', payload: { application_id: app.id, kind: kind as keyof typeof CHECK_KINDS, source: 'self', state: e.target.value as keyof typeof CHECK_STATES, version: own?.version ?? 0 } })) setNotice('自己確認を保存しました。') }}>{Object.entries(CHECK_STATES).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label> })}</section>
      <section className="panel vendor-day-panel"><h2>当日の予定</h2>{data.timeline.map(item => <p key={item.id}>{formatOperationDate(item.scheduled_at)}　{item.title} {item.completed_at ? '・完了' : ''}</p>)}{!data.timeline.length && <p>予定はまだ登録されていません。</p>}</section>
      <form className="panel vendor-day-panel" onSubmit={async e => { e.preventDefault(); if (await mutate({ command: 'incident', payload: { application_id: app.id, title: report, kind: 'other', priority: 'normal', state: 'new', note: '', assignee: '', location: app.label, version: 0 } })) { setReport(''); setNotice('主催者へ対応依頼を共有しました。') } }}><h2>困りごとを主催者へ報告</h2><label className="vendor-day-field">状況<input maxLength={200} value={report} disabled={busy} onChange={e => setReport(e.target.value)} required placeholder="例：電源が使えないため確認をお願いします" /></label><button className="button button-primary" disabled={busy || !report.trim()}>対応を依頼する</button></form>
    </>}
  </div>
}
