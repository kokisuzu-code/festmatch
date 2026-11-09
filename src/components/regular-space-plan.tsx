'use client'

import Link from 'next/link'
import { useState } from 'react'
import BoothMap from '@/components/bidding/BoothMap'

type PlanSpace = {
  id: string
  label: string
  genre: string | null
  map_x: number | null
  map_y: number | null
  occupancy: string
  candidates?: { id: string; name: string }[]
}

export default function RegularSpacePlan({ url, spaces, eventId }: {
  url: string
  spaces: PlanSpace[]
  eventId?: string
}) {
  const [selected, setSelected] = useState('')
  const current = spaces.find(space => space.id === selected)
  return <section className="panel">
    <h2>会場区画図</h2>
    <BoothMap url={url} spaces={spaces.map(space => ({
      ...space, label: `${space.label.split('（')[0]} · ${space.occupancy}`,
    }))} onSelect={setSelected} focused={selected} />
    <div className="button-row" aria-label="区画を選択">
      {spaces.map(space => <button type="button" className={space.id === selected ? 'button button-primary' : 'button button-secondary'} aria-pressed={space.id === selected} onClick={() => setSelected(space.id)} key={space.id}>{space.label} · {space.occupancy}</button>)}
    </div>
    {current && <div className="action-box" aria-live="polite">
      <strong>{current.label}　{current.occupancy}</strong>
      {eventId && current.candidates?.length ? <div className="button-row">{current.candidates.map(app =>
        <Link key={app.id} className="button button-secondary" href={`/organizer/events/${eventId}?space=${current.id}&application=${app.id}#application-${app.id}`}>{app.name}の割当へ</Link>
      )}</div> : null}
      {eventId && current.occupancy === '空き' && !current.candidates?.length && <p>この区画に割当可能な応募はありません。</p>}
    </div>}
  </section>
}
