import type { CSSProperties } from 'react'
import { PREFECTURES } from '@/lib/prefectures'
import type { FestMapDesign } from '@/lib/site/festmap-design'
import styles from './DirectoryHeader.module.css'

type Props = {
  design: FestMapDesign
  query?: string
  prefecture?: string
  regionalPage?: boolean
}

function typography(style: FestMapDesign['title'] | FestMapDesign['search']) {
  return {
    '--desktop-size': `${style.desktop}px`,
    '--mobile-size': `${style.mobile}px`,
    '--text-color': style.color,
  } as CSSProperties
}

export default function DirectoryHeader({ design, query = '', prefecture = '', regionalPage }: Props) {
  return <div className={styles.frame}>
    <section className={`festmap-intro ${styles.intro}`}>
      <div className={styles.copy}>
        <p className={`eyebrow ${styles.type}`} style={typography(design.eyebrow)}>{design.eyebrow.text}</p>
        <h1 className={styles.type} style={typography(design.title)}>{regionalPage ? `${prefecture}のイベント` : design.title.text}</h1>
        <p className={styles.type} style={typography(design.description)}>{design.description.text}</p>
      </div>
      <form className={`festmap-search ${styles.search}`} action="/festmap" method="get" role="search" style={typography(design.search)}>
        <input name="q" defaultValue={query} aria-label="イベント名・エリア名" placeholder={design.search.placeholder} />
        <select name="prefecture" defaultValue={prefecture} aria-label="都道府県">
          <option value="">{design.search.allPrefectures}</option>
          {PREFECTURES.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}
        </select>
        <button type="submit" className="button button-primary" style={{ backgroundColor: design.search.buttonBackground }}>{design.search.button}</button>
      </form>
    </section>
  </div>
}
