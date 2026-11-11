import { PREFECTURES } from '@/lib/prefectures'
import PublicEventCard, { type PublicEvent } from './PublicEventCard'

type Props = {
  events: PublicEvent[]
  query?: string
  prefecture?: string
  regionalPage?: boolean
}

export default function PublicEventDirectory({ events, query = '', prefecture = '', regionalPage = false }: Props) {
  return (
    <main className="festmap-main">
      <section className="festmap-intro">
        <div>
          <p className="eyebrow">FESTMAP</p>
          <h1>{regionalPage ? `${prefecture}のイベント` : '全国のイベントを探す'}</h1>
          <p>主催者が公開した募集情報と、公式ソースに基づく外部イベントを掲載しています。</p>
        </div>
        <form className="festmap-search" action="/festmap" method="get" role="search">
          <input name="q" defaultValue={query} aria-label="イベント名・エリア名" placeholder="イベント名・エリア名で検索" />
          <select name="prefecture" defaultValue={prefecture} aria-label="都道府県">
            <option value="">すべての都道府県</option>
            {PREFECTURES.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}
          </select>
          <button type="submit" className="button button-primary">検索</button>
        </form>
      </section>
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
