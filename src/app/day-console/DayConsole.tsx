'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEventOperations } from '@/components/useEventOperations'
import { openDirectChat } from '@/app/chat/actions'
import { CHECK_KINDS, CHECK_STATES, INCIDENT_STATES, STALL_STATUS, formatOperationDate, fromTokyoInput, operationsCsv, toTokyoInput, type OperationData, type OperationInput, type RunItem } from '@/lib/event-operations'
import OperationMap from './OperationMap'

export type DayConsoleEvent = { id: string; title: string; startsAt: string; endsAt: string; address: string; slug?: string }
const workspaceMeta = {
  overview: { title: '当日ダッシュボード', description: '到着・営業・確認事項を、保存された最新の状況から確認します。' },
  map: { title: '会場マップ', description: '会場図を添付し、登録済みの区画を配置します。' },
  vendors: { title: '出店者管理', description: '承認済みベンダーの到着・営業状況を更新します。' },
  broadcast: { title: '全体配信', description: '参加ベンダーへのお知らせと、確認状況を管理します。' },
  attention: { title: '要対応', description: '未到着と現場で報告されたトラブルを確認します。' },
  checklist: { title: '運営チェック', description: 'ベンダーの自己確認と、主催者の確認を分けて記録します。' },
  timeline: { title: 'タイムライン', description: 'イベントの日付に合わせて予定を登録し、完了を記録します。' },
} as const

type Workspace = keyof typeof workspaceMeta
const navItems: Workspace[] = ['overview', 'map', 'vendors', 'broadcast', 'attention', 'checklist', 'timeline']

export default function DayConsole({ events, operatorName, initialEventId }: { events: DayConsoleEvent[]; operatorName: string; initialEventId?: string }) {
  const [eventId, setEventId] = useState(initialEventId ?? events[0]?.id ?? '')
  if (!events.length) return <main className="panel empty-state"><h1>当日運営を始める</h1><p>イベントを作成し、ベンダーの応募を承認すると当日の状況を管理できます。</p><Link className="button button-primary" href="/organizer/events/new">イベントを作成</Link><Link className="button button-secondary" href="/organizer">主催者ホームへ戻る</Link></main>
  return <DayWorkspace key={eventId} eventId={eventId} events={events} operatorName={operatorName} onEventChange={setEventId} />
}

function DayWorkspace({ eventId, events, operatorName, onEventChange }: { eventId: string; events: DayConsoleEvent[]; operatorName: string; onEventChange: (id: string) => void }) {
  const router = useRouter()
  const { data, error, setError, busy, loading, refresh, mutate } = useEventOperations(eventId)
  const [activeNav, setActiveNav] = useState<Workspace>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [mapBusy, setMapBusy] = useState(false)
  const locked = busy || chatBusy || mapBusy
  const selected = data?.applications.find(app => app.id === selectedId)
  const stateFor = (id: string) => data?.states.find(state => state.application_id === id)
  const waiting = data?.applications.filter(app => ['unknown', 'not_arrived'].includes(stateFor(app.id)?.status ?? 'unknown')) ?? []
  const incidents = data?.incidents.filter(item => item.state !== 'resolved') ?? []
  const completedChecks = data?.checks.filter(item => item.source === 'organizer' && ['checked', 'na'].includes(item.state)).length ?? 0
  const totalChecks = (data?.applications.length ?? 0) * Object.keys(CHECK_KINDS).length
  const event = events.find(item => item.id === eventId)!

  function jumpTo(id: Workspace) { setActiveNav(id); setSelectedId(null) }
  async function save(operation: OperationInput) {
    setNotice('')
    const ok = await mutate(operation)
    if (ok) setNotice('保存しました。')
    return ok
  }
  async function chat(vendorId: string) {
    if (locked) return
    setChatBusy(true); setError('')
    try { const threadId = await openDirectChat(eventId, vendorId); router.push(`/organizer/events/${eventId}/chat/${threadId}`) }
    catch { setError('チャットを開けませんでした。承認状況を確認してください。'); setChatBusy(false) }
  }
  function downloadCsv() {
    if (!data) return
    const url = URL.createObjectURL(new Blob([operationsCsv(data)], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = `festmatch-${eventId}-operations.csv`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="day-console-page"><div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">F</span><div><strong>FestMatch</strong><small>DAY CONTROL</small></div></div>
      <div className="event-mini"><span className="live-dot" /><div><b>当日運営</b><small>{event.title}</small></div></div>
      <nav aria-label="当日運営メニュー">{navItems.map((id, index) => <button key={id} aria-current={activeNav === id ? 'page' : undefined} className={activeNav === id ? 'active' : ''} onClick={() => jumpTo(id)}><span>{String(index + 1).padStart(2, '0')}</span>{workspaceMeta[id].title}{id === 'attention' && incidents.length > 0 && <em>{incidents.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><Link href="/organizer">← 主催者ホームへ戻る</Link><div className="operator"><span>{operatorName.slice(0, 2)}</span><div><b>{operatorName}</b><small>主催者</small></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><label className="event-select"><span>イベント</span><select aria-label="イベント" value={eventId} disabled={locked} onChange={e => onEventChange(e.target.value)}>{events.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="top-actions"><button className="ghost-button" disabled={locked} onClick={async () => { setError(''); if (await refresh()) setNotice('最新の状態を表示しています。') }}>最新表示</button><button className="announce" onClick={() => jumpTo('broadcast')}>一斉アナウンス</button></div></header>
      <div className="content">
        <section className="welcome"><div><p className="eyebrow">EVENT OPERATIONS</p><h1>{workspaceMeta[activeNav].title}</h1><p>{workspaceMeta[activeNav].description}</p><div className="workspace-event-line"><b>{event.title}</b><span>{formatOperationDate(event.startsAt)}〜{formatOperationDate(event.endsAt)} ・ {event.address}</span></div></div><Link className="ghost-button" href={`/organizer/events/${eventId}`}>イベント管理</Link></section>
        <div className="ops-feedback" aria-live="polite">{locked ? '処理中…' : notice || '30秒ごとに最新の状況を確認します。'}</div>
        {error && <div className="ops-error" role="alert">{error}<button disabled={locked} onClick={async () => { setError(''); await refresh() }}>再読み込み</button><Link href={`/login?next=${encodeURIComponent(`/day-console?event=${eventId}`)}`}>ログイン</Link></div>}
        {loading && <p role="status">イベントの状況を読み込み中…</p>}
        {data && <div className={`ops-workspace view-${activeNav}`}>
          {activeNav === 'overview' && <>
            <section className="metrics">
              {[['到着済み', data.applications.length - waiting.length, `${data.applications.length}店舗中`], ['営業中', data.states.filter(s => s.status === 'open').length, '店舗'], ['未解決のトラブル', incidents.length, '件'], ['運営チェック', completedChecks, `${totalChecks}項目中`]].map(([label, count, unit]) => <article key={label}><div className="metric-top"><small>{label}</small></div><div className="metric-value"><b>{count}</b><span>{unit}</span></div></article>)}
            </section>
            {!data.applications.length && <div className="ops-panel"><h2>承認済みベンダーはまだいません</h2><p>応募を承認すると、到着状況・運営チェック・個別連絡を使えます。</p><Link href={`/organizer/events/${eventId}`}>応募を確認する</Link></div>}
            <section className="ops-two-col"><div className="ops-panel"><h2>優先して確認すること</h2><p>未到着・未確認：{waiting.length}店舗</p><p>未解決のトラブル：{incidents.length}件</p><button onClick={() => jumpTo('attention')}>要対応を開く</button></div><div className="ops-panel"><h2>次の予定</h2>{data.timeline.filter(item => !item.completed_at).slice(0, 3).map(item => <p key={item.id}><time>{formatOperationDate(item.scheduled_at)}</time>　{item.title}</p>)}{!data.timeline.length && <p>予定が未登録です。搬入・開場・撤収の時間を登録してください。</p>}<button onClick={() => jumpTo('timeline')}>タイムラインを開く</button></div></section>
          </>}
          {activeNav === 'vendors' && <section className="card vendors-workspace ops-panel"><div className="workspace-panel-head"><div><h2>{data.applications.length}店舗の状況</h2><p>区画を移動しても、ベンダーごとの状況を保持します。</p></div><button onClick={downloadCsv}>CSV出力</button></div><label className="ops-field">状況で絞り込み<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">すべて</option>{Object.entries(STALL_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="ops-list">{data.applications.filter(app => filter === 'all' || (stateFor(app.id)?.status ?? 'unknown') === filter).map(app => <article className="ops-row" key={app.id}><div><strong>{app.label} ・ {app.name}</strong><small>{app.genre}</small></div><select aria-label={`${app.name}の状況`} disabled={locked} value={stateFor(app.id)?.status ?? 'unknown'} onChange={e => void save({ command: 'stall', payload: { application_id: app.id, status: e.target.value as keyof typeof STALL_STATUS, version: stateFor(app.id)?.version ?? 0 } })}>{Object.entries(STALL_STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button disabled={locked} onClick={() => void chat(app.vendor_id)}>個別チャット</button><button onClick={() => setSelectedId(app.id)}>確認項目</button></article>)}</div></section>}
          {activeNav === 'map' && <OperationMap key={eventId} data={data} busy={locked} setBusy={setMapBusy} onError={setError} save={save} onStall={setSelectedId} />}
          {activeNav === 'broadcast' && <section className="broadcast-workspace"><Broadcast data={data} busy={locked} save={save} /></section>}
          {activeNav === 'checklist' && <section className="ops-panel"><h2>ベンダーごとの運営チェック</h2><p>{completedChecks} / {totalChecks}項目を確認済み。自己確認の内容を確認し、主催者がチェックします。</p>{data.applications.map(app => <details key={app.id} className="ops-check-group"><summary>{app.label} ・ {app.name}</summary><Checks data={data} applicationId={app.id} busy={locked} save={save} /></details>)}{!data.applications.length && <p>承認済みベンダーが表示されます。</p>}</section>}
          {activeNav === 'attention' && <section className="ops-two-col"><div className="ops-panel"><h2>トラブルの記録</h2><IncidentForm data={data} busy={locked} save={save} /><div className="ops-list">{data.incidents.map(item => <article className="ops-incident" key={item.id}><strong>{item.priority === 'urgent' ? '緊急：' : ''}{item.title}</strong><p>{item.location} {item.note}</p><select aria-label={`${item.title}の対応状況`} disabled={locked} value={item.state} onChange={e => { const { id, application_id, kind, priority, title, location, assignee, note, photo_path, version } = item; void save({ command: 'incident', payload: { id, application_id, kind, priority, title, location, assignee, note, photo_path, version, state: e.target.value as keyof typeof INCIDENT_STATES } }) }}>{Object.entries(INCIDENT_STATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></article>)}{!data.incidents.length && <p>トラブルの記録はありません。</p>}</div></div><div className="ops-panel"><h2>未到着・未確認</h2>{waiting.map(app => <article className="ops-row" key={app.id}><div><strong>{app.label}</strong><small>{app.name}</small></div><button disabled={locked} onClick={() => void chat(app.vendor_id)}>連絡</button><button onClick={() => { setSelectedId(app.id) }}>状況を確認</button></article>)}{!waiting.length && <p>すべての到着状況を確認済みです。</p>}</div></section>}
          {activeNav === 'timeline' && <Timeline data={data} busy={locked} save={save} />}
        </div>}
      </div>
    </main>
    {selected && data && <div className="overlay"><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="ops-stall-title"><button autoFocus className="drawer-close" onClick={() => setSelectedId(null)} aria-label="閉じる">×</button><p className="drawer-label">{selected.label}</p><h2 id="ops-stall-title">{selected.name}</h2><label className="ops-field">現在の状況<select disabled={locked} value={stateFor(selected.id)?.status ?? 'unknown'} onChange={e => void save({ command: 'stall', payload: { application_id: selected.id, status: e.target.value as keyof typeof STALL_STATUS, version: stateFor(selected.id)?.version ?? 0 } })}>{Object.entries(STALL_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Checks data={data} applicationId={selected.id} busy={locked} save={save} /><button disabled={locked} className="send-broadcast" onClick={() => void chat(selected.vendor_id)}>個別チャットを開く</button>{error && <p role="alert" className="ops-error">{error}</p>}<p aria-live="polite">{busy ? '保存中…' : notice}</p></aside></div>}
  </div></div>
}

type Save = (operation: OperationInput) => Promise<boolean>
function Checks({ data, applicationId, busy, save }: { data: OperationData; applicationId: string; busy: boolean; save: Save }) {
  return <div>{Object.entries(CHECK_KINDS).map(([kind, label]) => {
    const organizer = data.checks.find(item => item.application_id === applicationId && item.kind === kind && item.source === 'organizer')
    const self = data.checks.find(item => item.application_id === applicationId && item.kind === kind && item.source === 'self')
    return <label className="ops-check" key={kind}><span><b>{label}</b><small>自己確認：{CHECK_STATES[self?.state ?? 'pending']}</small></span><select aria-label={`${label}の主催者確認`} disabled={busy} value={organizer?.state ?? 'pending'} onChange={e => void save({ command: 'check', payload: { application_id: applicationId, kind: kind as keyof typeof CHECK_KINDS, source: 'organizer', state: e.target.value as keyof typeof CHECK_STATES, version: organizer?.version ?? 0 } })}>{Object.entries(CHECK_STATES).map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
  })}</div>
}

function Broadcast({ data, busy, save }: { data: OperationData; busy: boolean; save: Save }) {
  const [body, setBody] = useState('')
  const [requiresAck, setRequiresAck] = useState(true)
  return <div className="ops-two-col"><form className="ops-panel ops-form" onSubmit={async e => { e.preventDefault(); if (await save({ command: 'announcement', payload: { body, kind: 'notice', requires_ack: requiresAck } })) setBody('') }}><h2>全体へのお知らせ</h2><p>承認済みの{data.applications.length}店舗の「当日の準備・連絡」に表示されます。</p><label>配信内容<textarea value={body} maxLength={2000} rows={7} disabled={busy} onChange={e => setBody(e.target.value)} required /></label><small>{body.length} / 2,000文字</small><label><input type="checkbox" checked={requiresAck} disabled={busy} onChange={e => setRequiresAck(e.target.checked)} />確認の回答を求める</label><button type="submit" disabled={busy || !body.trim() || !data.applications.length}>{busy ? '保存中…' : '参加ベンダーへ配信する'}</button></form><div className="ops-panel"><h2>配信履歴</h2>{data.announcements.map(item => { const receipts = data.receipts.filter(row => row.announcement_id === item.id); return <article className="ops-announcement" key={item.id}><time>{formatOperationDate(item.created_at)}</time><p>{item.body}</p><small>閲覧 {receipts.filter(row => row.read_at).length} / {receipts.length}{item.requires_ack && ` ・ 確認回答 ${receipts.filter(row => row.acknowledged_at).length} / ${receipts.length}`}</small></article> })}{!data.announcements.length && <p>まだ配信していません。</p>}</div></div>
}

function Timeline({ data, busy, save }: { data: OperationData; busy: boolean; save: Save }) {
  const [editing, setEditing] = useState<RunItem | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toTokyoInput(data.event.starts_at))
  return <section className="ops-two-col"><div className="ops-panel"><h2>進行予定</h2>{data.timeline.map(item => <article className="ops-row" key={item.id}><label><input type="checkbox" checked={Boolean(item.completed_at)} disabled={busy} onChange={e => void save({ command: 'timeline', payload: { id: item.id, title: item.title, scheduled_at: item.scheduled_at, completed: e.target.checked, version: item.version } })} /> {item.title}<small>{formatOperationDate(item.scheduled_at)} ・ {item.completed_at ? '完了' : '未完了'}</small></label><button disabled={busy} onClick={() => { setEditing(item); setTitle(item.title); setDate(toTokyoInput(item.scheduled_at)) }}>編集</button></article>)}{!data.timeline.length && <p>予定はまだ登録されていません。</p>}</div><form className="ops-panel ops-form" onSubmit={async e => { e.preventDefault(); if (await save({ command: 'timeline', payload: { ...(editing ? { id: editing.id } : {}), title, scheduled_at: fromTokyoInput(date), completed: Boolean(editing?.completed_at), version: editing?.version ?? 0 } })) { setEditing(null); setTitle('') } }}><h2>{editing ? '予定を編集' : '予定を追加'}</h2><label>内容<input value={title} maxLength={200} required disabled={busy} onChange={e => setTitle(e.target.value)} placeholder="例：搬入開始" /></label><label>予定日時（日本時間）<input type="datetime-local" value={date} required disabled={busy} onChange={e => setDate(e.target.value)} /></label><button disabled={busy || !title.trim()}>{busy ? '保存中…' : '予定を保存'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setTitle('') }}>編集をやめる</button>}</form></section>
}

function IncidentForm({ data, busy, save }: { data: OperationData; busy: boolean; save: Save }) {
  const [title, setTitle] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal'>('normal')
  return <form className="ops-form" onSubmit={async e => { e.preventDefault(); if (await save({ command: 'incident', payload: { application_id: applicationId || null, kind: 'other', priority, title, location: '', assignee: '', state: 'new', note: '', version: 0 } })) setTitle('') }}><label>対応が必要な内容<input value={title} onChange={e => setTitle(e.target.value)} disabled={busy} maxLength={200} required /></label><label>対象<select value={applicationId} disabled={busy} onChange={e => setApplicationId(e.target.value)}><option value="">会場全体</option>{data.applications.map(app => <option key={app.id} value={app.id}>{app.label} ・ {app.name}</option>)}</select></label><label>優先度<select value={priority} disabled={busy} onChange={e => setPriority(e.target.value as typeof priority)}><option value="normal">通常</option><option value="high">高</option><option value="urgent">緊急</option></select></label><button disabled={busy || !title.trim()}>対応事項を登録</button></form>
}
