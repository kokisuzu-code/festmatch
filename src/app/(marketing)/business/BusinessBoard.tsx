"use client"

import { useEffect, useMemo, useState } from "react"

type Stage = "entry" | "review" | "approved"

type VendorNode = {
  id: number
  label: string
  stage: Stage
  size: number
}

const vendors: VendorNode[] = [
  { id: 1, label: "FOOD", stage: "entry", size: 46 },
  { id: 2, label: "CAFE", stage: "entry", size: 38 },
  { id: 3, label: "CRAFT", stage: "entry", size: 42 },
  { id: 4, label: "BAKE", stage: "entry", size: 34 },
  { id: 5, label: "DELI", stage: "entry", size: 36 },
  { id: 6, label: "SWEET", stage: "entry", size: 40 },
  { id: 7, label: "TACO", stage: "review", size: 42 },
  { id: 8, label: "TEA", stage: "review", size: 35 },
  { id: 9, label: "PIZZA", stage: "review", size: 45 },
  { id: 10, label: "SOAP", stage: "review", size: 36 },
  { id: 11, label: "JAM", stage: "review", size: 33 },
  { id: 12, label: "CURRY", stage: "approved", size: 46 },
  { id: 13, label: "BEER", stage: "approved", size: 39 },
  { id: 14, label: "BREAD", stage: "approved", size: 43 },
  { id: 15, label: "FLOWER", stage: "approved", size: 39 },
  { id: 16, label: "COFFEE", stage: "approved", size: 44 },
  { id: 17, label: "VEGAN", stage: "approved", size: 36 },
  { id: 18, label: "DONUT", stage: "approved", size: 38 },
]

const positions: Record<Stage, Array<[number, number]>> = {
  entry: [[55, 84], [112, 61], [102, 124], [48, 145], [148, 151], [163, 95]],
  review: [[242, 70], [292, 99], [223, 130], [278, 151], [327, 137], [322, 61]],
  approved: [[414, 61], [468, 88], [402, 121], [459, 145], [520, 128], [522, 67], [561, 102], [381, 159]],
}

const stageMeta = {
  entry: { label: "応募受付", color: "#d8e5ea" },
  review: { label: "確認中", color: "#f3ae78" },
  approved: { label: "出店確定", color: "#2e7c73" },
} satisfies Record<Stage, { label: string; color: string }>

export default function BusinessBoard() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setStep((value) => (value + 1) % 6), 2600)
    return () => window.clearInterval(timer)
  }, [])

  const nodes = useMemo(() => {
    const movingId = 6 - step
    const occupied: Record<Stage, number> = { entry: 0, review: 0, approved: 0 }

    return vendors.map((vendor) => {
      const stage: Stage = vendor.id === movingId ? "review" : vendor.stage
      const slot = occupied[stage]++
      const [x, y] = positions[stage][slot % positions[stage].length]
      return { ...vendor, stage, x, y }
    })
  }, [step])

  const counts = nodes.reduce<Record<Stage, number>>((result, node) => {
    result[node.stage] += 1
    return result
  }, { entry: 0, review: 0, approved: 0 })

  return <div className="fmb-board" aria-label="応募状況のデモデータ">
    <div className="fmb-board-head">
      <div>
        <p>湘南フードフェスティバル 2026</p>
        <span>出店者ボード</span>
      </div>
      <span className="fmb-live"><i /> LIVE DEMO</span>
    </div>
    <div className="fmb-board-metrics">
      {(Object.keys(stageMeta) as Stage[]).map((stage) => <div key={stage}>
        <span><i style={{ background: stageMeta[stage].color }} />{stageMeta[stage].label}</span>
        <strong>{counts[stage]}</strong>
      </div>)}
    </div>
    <svg className="fmb-data-stage" viewBox="0 0 600 205" role="img" aria-label="出店応募が審査工程を進む様子">
      <path d="M198 24V185M357 24V185" className="fmb-divider" />
      {nodes.map((node) => <g key={node.id} className={`fmb-node fmb-node-${node.stage}`} style={{ transform: `translate(${node.x}px, ${node.y}px)` }}>
        <circle r={node.size / 2} />
        <text textAnchor="middle" dominantBaseline="central">{node.label}</text>
      </g>)}
    </svg>
    <div className="fmb-board-foot">
      <span>n = 18 / DEMO DATA</span>
      <span>最終更新 たった今</span>
    </div>
  </div>
}
