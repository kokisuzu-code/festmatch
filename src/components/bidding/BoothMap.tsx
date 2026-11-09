'use client'

import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import styles from './bidding.module.css'

type Space = { id: string; label: string; map_x: number | null; map_y: number | null; map_width?: number | null; map_height?: number | null }
export default function BoothMap({ url, spaces, selected = [], focused, onSelect, onPlace, onMove }: {
  url: string | null; spaces: Space[]; selected?: string[]; focused?: string;
  onSelect?: (id: string) => void; onPlace?: (x:number,y:number)=>void; onMove?: (id:string,x:number,y:number)=>void;
}) {
  const map = useRef<HTMLDivElement>(null)
  const start = useRef<{id:string;x:number;y:number} | null>(null)
  const suppressClick = useRef(false)
  const [drag, setDrag] = useState<{id:string;x:number;y:number} | null>(null)
  function point(x:number,y:number) {
    const rect = map.current!.getBoundingClientRect()
    return [Math.max(0,Math.min(100,Math.round((x-rect.left)/rect.width*10000)/100)),Math.max(0,Math.min(100,Math.round((y-rect.top)/rect.height*10000)/100))]
  }
  function place(e:MouseEvent<HTMLDivElement>) { if (onPlace) { const [x,y] = point(e.clientX,e.clientY); onPlace(x,y) } }
  function down(e:PointerEvent<HTMLButtonElement>,id:string) {
    if (!onMove || onPlace) return
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); start.current={id,x:e.clientX,y:e.clientY}; suppressClick.current=false; onSelect?.(id)
  }
  function move(e:PointerEvent<HTMLButtonElement>,id:string) {
    if (start.current?.id !== id) return
    if (Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>3) { suppressClick.current=true; const [x,y]=point(e.clientX,e.clientY); setDrag({id,x,y}) }
  }
  function up(e:PointerEvent<HTMLButtonElement>,id:string) {
    if (start.current?.id !== id) return
    if (suppressClick.current) { const [x,y]=point(e.clientX,e.clientY); onMove?.(id,x,y) }
    start.current=null; setDrag(null)
  }
  if (!url) return <div className={styles.empty}>区画図の画像を添付してください。</div>
  return <div className={styles.mapScroll}><div ref={map} className={`${styles.map} ${onPlace ? styles.editMap : ''}`} onClick={place}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} draggable={false} alt="会場区画図。区画番号を選択して詳細を確認できます。" />
    {spaces.filter(space => space.map_x !== null && space.map_y !== null).map(space => <button type="button" key={space.id}
      style={{left:`${drag?.id === space.id ? drag.x : space.map_x}%`,top:`${drag?.id === space.id ? drag.y : space.map_y}%`,...(onMove ? {width:`${space.map_width ?? 7}%`,height:`${space.map_height ?? 7}%`,touchAction:'none',cursor:'grab'} : {})}}
      className={`${styles.pin} ${selected.includes(space.id) ? styles.selected : ''} ${focused === space.id ? styles.focused : ''} ${onMove ? styles.areaPin : ''}`}
      aria-label={`${space.label}を選択${onMove ? '。矢印キーで移動' : ''}`} aria-pressed={focused === space.id || selected.includes(space.id)}
      onPointerDown={e => down(e,space.id)} onPointerMove={e => move(e,space.id)} onPointerUp={e => up(e,space.id)} onPointerCancel={() => { start.current=null; setDrag(null) }}
      onKeyDown={e => { if (!onMove || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return; e.preventDefault(); const x=Number(space.map_x)+(e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0); const y=Number(space.map_y)+(e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0); onMove(space.id,Math.max(0,Math.min(100,x)),Math.max(0,Math.min(100,y))) }}
      onClick={e => {e.stopPropagation(); if (suppressClick.current) {suppressClick.current=false;return} onSelect?.(space.id)}}>{space.label}</button>)}
  </div></div>
}
