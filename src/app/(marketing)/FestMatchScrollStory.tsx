"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

const storySteps = [
  {
    time: "FRI 20:00",
    title: "予定のない週末に、ひとつ候補ができる。",
    body: "駅名やエリアを入れるだけ。近くで開かれるマルシェや音楽祭、親子イベントがまとまって見つかります。",
    image: "/story/discover-at-home.webp",
    alt: "自宅でスマートフォンから週末のイベントを探す人",
  },
  {
    time: "SAT 09:30",
    title: "待ち合わせ場所で、行き先がすぐ決まる。",
    body: "日付と場所から候補を絞り込み。SNSを何度も見比べなくても、今日行ける予定がわかります。",
    image: "/story/meet-at-station.webp",
    alt: "駅前でスマートフォンのイベント情報を見る友人",
    feature: "場所と日付で検索",
  },
  {
    time: "SAT 10:15",
    title: "駅を出たら、そのまま会場へ。",
    body: "開催時間、会場、内容をひとつの画面に整理。迷う時間を減らして、街へ出かけられます。",
    image: "/reference/waterfront-market.webp",
    alt: "港沿いで開かれている朝市",
  },
  {
    time: "SAT 11:40",
    title: "知らなかった店と、偶然出会う。",
    body: "フード、音楽、ワークショップ。いつもの街にある、まだ知らない楽しみが見つかります。",
    image: "/reference/summer-festival.webp",
    alt: "地域の夏祭りを楽しむ人たち",
    feature: "必要な情報をひとつに",
  },
  {
    time: "SAT 14:20",
    title: "見るだけだった週末が、体験に変わる。",
    body: "家族でも、友人とでも、一人でも。気分に合うイベントから、次にやってみたいことへ。",
    image: "/reference/craft-workshop.webp",
    alt: "地域イベントのクラフト体験",
  },
  {
    time: "SAT 17:30",
    title: "帰り道には、もう次の予定がある。",
    body: "気になるイベントを保存して、家族や友人に共有。次の週末も、近くから楽しめます。",
    image: "/story/walk-home.webp",
    alt: "地域のマーケットから帰る二人",
    feature: "保存して、すぐ共有",
  },
] as const

export default function FestMatchScrollStory() {
  const [activeIndex, setActiveIndex] = useState(0)
  const stepRefs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries.find((entry) => entry.isIntersecting)
        if (!activeEntry) return
        const index = Number((activeEntry.target as HTMLElement).dataset.storyIndex)
        if (Number.isFinite(index)) setActiveIndex(index)
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    )

    const nodes = stepRefs.current
    nodes.forEach((node) => node && observer.observe(node))
    return () => nodes.forEach((node) => node && observer.unobserve(node))
  }, [])

  return (
    <section className="fm-story" id="story" aria-labelledby="fm-story-title">
      <div className="fm-home-wrap fm-story-intro">
        <p>01 — A WEEKEND WITH FESTMATCH</p>
        <h2 id="fm-story-title">予定のない金曜から、<br />満足した土曜の帰り道まで。</h2>
        <span>スクロールして、FestMatchで見つかる週末を追ってみてください。</span>
      </div>

      <div className="fm-story-grid">
        <div className="fm-story-stage" aria-label="FestMatchで見つかる週末の様子">
          {storySteps.map((step, index) => (
            <Image
              key={step.image}
              className={`fm-story-photo${activeIndex === index ? " is-active" : ""}`}
              src={step.image}
              alt={step.alt}
              fill
              sizes="(max-width: 800px) 100vw, 50vw"
              priority={index === 0}
              aria-hidden={activeIndex !== index}
            />
          ))}
          <div className="fm-story-stage-meta" aria-live="polite">
            <span>{storySteps[activeIndex].time}</span>
            <b>{String(activeIndex + 1).padStart(2, "0")} / 06</b>
          </div>
        </div>

        <div className="fm-story-steps">
          {storySteps.map((step, index) => (
            <article
              className={`fm-story-step${step.feature ? " is-feature" : ""}`}
              data-story-index={index}
              key={step.time}
              ref={(node) => { stepRefs.current[index] = node }}
            >
              <div className="fm-story-step-card">
                <div className="fm-story-step-number"><span>{step.time}</span><i /><b>{String(index + 1).padStart(2, "0")} / 06</b></div>
                {step.feature && <small>FEATURE — {step.feature}</small>}
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
