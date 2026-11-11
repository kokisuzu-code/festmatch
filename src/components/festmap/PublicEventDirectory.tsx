import DirectoryHeader from './DirectoryHeader'
import type { FestMapDesign } from '@/lib/site/festmap-design'
import PublicEventCard, { type PublicEvent } from './PublicEventCard'

type Props = {
  design: FestMapDesign
  events: PublicEvent[]
  query?: string
  prefecture?: string
  regionalPage?: boolean
}

export default function PublicEventDirectory({ design, events, query = '', prefecture = '', regionalPage = false }: Props) {
  return (
    <main className="festmap-main">
      <DirectoryHeader design={design} query={query} prefecture={prefecture} regionalPage={regionalPage} />
      <section className="public-event-list" aria-labelledby="public-events-title">
        <div className="section-heading">
          <h2 id="public-events-title">{prefecture ? `${prefecture}の公開イベント` : '公開イベント'}</h2>
          <span>{events.length} 件</span>
        </div>
        {events.length ? events.map((event) => (
          <PublicEventCard key={`${event.is_external ? 'external' : 'festmatch'}-${event.id}`} event={event} />
        )) : (
          <div className="empty-state">
            <h2>公開中のイベントがありません</h2>
            <p>条件を変更するか、後ほどもう一度ご確認ください。</p>
          </div>
        )}
      </section>
    </main>
  )
}
