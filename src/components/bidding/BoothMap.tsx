'use client'

import type { MouseEvent } from 'react'
import styles from './bidding.module.css'

export default function BoothMap({ url, spaces, selected = [], focused, onSelect, onPlace }: { url: string | null; spaces: { id: string; label: string; map_x: number | null; map_y: number | null }[]; selected?: string[]; focused?: string; onSelect?: (id: string) => void; onPlace?: (x: number, y: number) => void }) {
  function place(event: MouseEvent<HTMLDivElement>) {
    if (!onPlace) return
    const rect = event.currentTarget.getBoundingClientRect()
    onPlace(Math.round((event.clientX-rect.left)/rect.width*10000)/100, Math.round((event.clientY-rect.top)/rect.height*10000)/100)
  }
  if (!url) return <div className={styles.empty}>区画図の画像を添付してください。</div>
  return <div className={styles.mapScroll}><div className={`${styles.map} ${onPlace ? styles.editMap : ''}`} onClick={place}>
    {/* Uploaded diagrams retain their natural aspect ratio for accurate pin placement. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt="会場区画図。区画を選択して詳細を確認できます。" />
    {spaces.filter(space => space.map_x !== null && space.map_y !== null).map(space => <button type="button" key={space.id} style={{ left: `${space.map_x}%`, top: `${space.map_y}%` }} className={`${styles.pin} ${selected.includes(space.id) ? styles.selected : ''} ${focused === space.id ? styles.focused : ''}`} aria-label={`${space.label}を選択`} onClick={event => { event.stopPropagation(); onSelect?.(space.id) }}>{space.label}</button>)}
  </div></div>
}
