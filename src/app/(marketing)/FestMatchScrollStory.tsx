"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

type StoryStep = {
  time: string
  title: string
  body: string
  image: string
  alt: string
  feature?: string
}

const storySteps: readonly StoryStep[] = [
  {
    time: "FRI 20:00",
    title: "金曜の夜、ふと予定を探す。",
    body: "明日はまだ何も決めていない。駅名を入れると、近くのマルシェや音楽イベントが並びます。",
    image: "/story/discover-candid.webp",
    alt: "カフェのテーブルでスマートフォンを見る手元",
  },
  {
    time: "SAT 09:30",
    title: "気になるものを、ひとつ選ぶ。",
    body: "日付、場所、開催時間。知りたいことだけを見比べて、行き先を決めます。",
    image: "/story/station-candid.webp",
    alt: "東京の駅構内でスマートフォンを見る人",
    feature: "エリアと日付で探す",
  },
  {
    time: "SAT 10:15",
    title: "駅を出たら、会場はすぐそこ。",
    body: "地図と会場情報を見ながら、いつもの街を少しだけ違う方向へ。",
    image: "/reference/waterfront-market.webp",
    alt: "港沿いで開かれている朝市",
  },
  {
    time: "SAT 11:40",
    title: "知らなかった店に、足が止まる。",
    body: "いい匂い、聞こえてくる音楽。画面では分からなかった楽しさに出会います。",
    image: "/reference/summer-festival.webp",
    alt: "地域の夏祭りを楽しむ人たち",
    feature: "開催情報をひとつに",
  },
  {
    time: "SAT 14:20",
    title: "やってみたかったことを、やってみる。",
    body: "家族でも、友人とでも、一人でも。その日の気分のまま、イベントを楽しめます。",
    image: "/reference/craft-workshop.webp",
    alt: "地域イベントのクラフト体験",
  },
  {
    time: "SAT 17:30",
    title: "帰り道、次の予定を保存する。",
    body: "気になったイベントを残して、誰かに送る。次の週末も、近くから。",
    image: "/story/walk-home.webp",
    alt: "地域のマーケットから帰る二人",
    feature: "保存して、すぐ共有",
  },
]

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
        <h2 id="fm-story-title">何も決めていない夜から、<br />少し満たされた帰り道まで。</h2>
        <span>ひとつのイベントを見つけるだけで、いつもの週末は少し変わります。</span>
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
