'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OperationData, OperationInput } from '@/lib/event-operations'

export default function OperationMap({ data, busy, setBusy, onError, save, onStall }: { data: OperationData; busy: boolean; setBusy: (value: boolean) => void; onError: (message: string) => void; save: (operation: OperationInput) => Promise<boolean>; onStall: (id: string) => void }) {
  const [pins, setPins] = useState(data.pins)
  const [mapPath, setMapPath] = useState(data.settings?.map_path ?? null)
  const [mapUrl, setMapUrl] = useState(data.mapUrl)
  const [baseVersion, setBaseVersion] = useState(data.settings?.version ?? 0)
  const [spaceId, setSpaceId] = useState(data.spaces[0]?.id ?? '')
  const [confirmed, setConfirmed] = useState(Boolean(data.settings?.map_confirmed_at))
  const [dirty, setDirty] = useState(false)
  const currentPin = pins.find(pin => pin.space_id === spaceId)
  const missing = data.spaces.filter(space => !pins.some(pin => pin.space_id === space.id))
  const conflict = baseVersion !== (data.settings?.version ?? 0)
  const imageMap = mapPath && /\.(png|jpe?g|webp)$/i.test(mapPath)

  function movePin(x: number, y: number) {
    if (!spaceId || busy) return
    setPins(current => [...current.filter(pin => pin.space_id !== spaceId), { space_id: spaceId, x, y }])
    setDirty(true); setConfirmed(false)
  }
  async function persist(confirm: boolean, path = mapPath) {
    const ok = await save({ command: 'map', payload: { map_path: path, pins, confirmed: confirm, version: baseVersion } })
    if (ok) { setBaseVersion(baseVersion + 1); setConfirmed(confirm); setDirty(false) }
    return ok
  }
  async function upload(file?: File) {
    if (!file || busy) return
    const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as Record<string, string>)[file.type]
    if (!extension || file.size > 6 * 1024 * 1024) { onError('会場図は6MB以下のPNG・JPG・WebPを選択してください。'); return }
    setBusy(true); onError('')
    try {
      const client = createClient()
      const { data: { user } } = await client.auth.getUser()
      if (!user) throw new Error('ログインし直してください。')
      const path = `${data.event.id}/map/${user.id}/${crypto.randomUUID()}.${extension}`
      const { error } = await client.storage.from('event-operations').upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw new Error('会場図を添付できませんでした。もう一度お試しください。')
      const signed = await client.storage.from('event-operations').createSignedUrl(path, 3600)
      if (!signed.data) throw new Error('添付した会場図を表示できませんでした。')
      setMapPath(path); setMapUrl(signed.data.signedUrl); setDirty(true); setConfirmed(false)
      await persist(false, path)
    } catch (cause) { onError(cause instanceof Error ? cause.message : '会場図を保存できませんでした。') }
    finally { setBusy(false) }
  }

  return <section className="ops-panel"><div className="workspace-panel-head"><div><h2>会場図と区画</h2><p>画像を添付し、区画を選んで配置位置を指定してください。</p></div><Link href={`/organizer/events/${data.event.id}/edit`}>区画を登録・編集</Link></div>
    {conflict && <p className="ops-error" role="alert">別の端末で会場図が更新されています。<button onClick={() => { setPins(data.pins); setMapPath(data.settings?.map_path ?? null); setMapUrl(data.mapUrl); setBaseVersion(data.settings?.version ?? 0); setConfirmed(Boolean(data.settings?.map_confirmed_at)); setDirty(false) }}>最新の保存内容を読み込む</button></p>}
    <div className="ops-map-controls"><label>会場図を添付<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || conflict} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label><button disabled title="画像の添付と手動の区画配置を利用できます。">PDFをAI取り込み（準備中）</button></div>
    <p className="ops-feedback">{dirty ? '配置の変更はまだ保存していません。' : confirmed ? 'すべての区画を配置・確認済みです。' : '保存した会場図と配置を表示しています。'}{missing.length > 0 && ` 未配置：${missing.map(space => space.label).join('、')}`}</p>
    {mapUrl && imageMap ? <div className="ops-map-image" role="group" aria-label="会場の区画配置" onClick={e => { if (busy || conflict) return; const box = e.currentTarget.getBoundingClientRect(); movePin(Math.round((e.clientX - box.left) / box.width * 1000) / 10, Math.round((e.clientY - box.top) / box.height * 1000) / 10) }}>
      {/* Signed private Storage URLs expire; a plain image avoids caching an expired URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mapUrl} alt="登録された会場図" />
      {pins.map(pin => { const space = data.spaces.find(item => item.id === pin.space_id); return <button key={pin.space_id} style={{ left: `${pin.x}%`, top: `${pin.y}%` }} onClick={e => { e.stopPropagation(); setSpaceId(pin.space_id); if (space?.assigned_application_id) onStall(space.assigned_application_id) }}>{space?.label ?? '区画'}</button> })}
    </div> : mapUrl ? <p><a href={mapUrl} target="_blank" rel="noopener noreferrer">登録済みの会場図を開く</a></p> : <div className="ops-map-empty"><h3>会場図はまだ添付されていません</h3><p>会場図の画像を添付すると、区画を配置できます。</p></div>}
    <div className="ops-map-controls"><label>配置する区画<select value={spaceId} disabled={busy || conflict} onChange={e => setSpaceId(e.target.value)}><option value="">区画を選択</option>{data.spaces.map(space => <option key={space.id} value={space.id}>{space.label}</option>)}</select></label><label>横位置（%）<input type="number" min="0" max="100" step="0.1" value={currentPin?.x ?? 50} disabled={!spaceId || busy || conflict} onChange={e => movePin(Math.min(100, Math.max(0, Number(e.target.value))), currentPin?.y ?? 50)} /></label><label>縦位置（%）<input type="number" min="0" max="100" step="0.1" value={currentPin?.y ?? 50} disabled={!spaceId || busy || conflict} onChange={e => movePin(currentPin?.x ?? 50, Math.min(100, Math.max(0, Number(e.target.value))))} /></label><button disabled={busy || !mapPath || conflict} onClick={() => void persist(false)}>配置を保存</button><button disabled={busy || !mapPath || !data.spaces.length || missing.length > 0 || conflict} onClick={() => void persist(true)}>全区画を確認済みにする</button></div>
    <div className="ops-space-grid">{data.spaces.map(space => <button key={space.id} disabled={!space.assigned_application_id} onClick={() => space.assigned_application_id && onStall(space.assigned_application_id)}><strong>{space.label}</strong><span>{data.applications.find(app => app.id === space.assigned_application_id)?.name ?? 'ベンダー未割当'}</span></button>)}</div>
  </section>
}
