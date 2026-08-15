"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StallStatus = "未到着" | "搬入中" | "営業中" | "終了" | "トラブル";

type Stall = {
  id: string;
  name: string;
  category: string;
  status: StallStatus;
  owner: string;
  phone: string;
  checks: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
};

export type DayConsoleEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  address: string;
  slug?: string;
  isDemo?: boolean;
  stalls: Array<Pick<Stall, "id" | "name" | "category" | "owner" | "phone">>;
};

type DayConsoleProps = {
  events: DayConsoleEvent[];
  operatorName: string;
};

const initialStalls: Stall[] = [
  { id: "K-01", name: "キッチンカー 01", category: "フード", status: "営業中", owner: "担当者 A", phone: "090-0000-0001", checks: 4, x: 8, y: 13, w: 13, h: 15, rotate: -2 },
  { id: "K-02", name: "キッチンカー 02", category: "フード", status: "営業中", owner: "担当者 B", phone: "090-0000-0002", checks: 4, x: 24, y: 10, w: 13, h: 15, rotate: 1 },
  { id: "K-03", name: "キッチンカー 03", category: "ドリンク", status: "搬入中", owner: "担当者 C", phone: "090-0000-0003", checks: 2, x: 41, y: 13, w: 13, h: 15, rotate: -1 },
  { id: "K-04", name: "キッチンカー 04", category: "スイーツ", status: "未到着", owner: "担当者 D", phone: "090-0000-0004", checks: 0, x: 58, y: 10, w: 13, h: 15, rotate: 2 },
  { id: "F-01", name: "飲食ブース 01", category: "飲食", status: "営業中", owner: "担当者 E", phone: "090-0000-0005", checks: 4, x: 76, y: 15, w: 14, h: 12, rotate: 1 },
  { id: "F-02", name: "飲食ブース 02", category: "飲食", status: "トラブル", owner: "担当者 F", phone: "090-0000-0006", checks: 3, x: 78, y: 32, w: 14, h: 12, rotate: -1 },
  { id: "M-01", name: "物販ブース 01", category: "物販", status: "営業中", owner: "担当者 G", phone: "090-0000-0007", checks: 4, x: 73, y: 52, w: 16, h: 12, rotate: 2 },
  { id: "M-02", name: "物販ブース 02", category: "物販", status: "営業中", owner: "担当者 H", phone: "090-0000-0008", checks: 4, x: 55, y: 67, w: 15, h: 12, rotate: -2 },
  { id: "P-01", name: "PRブース 01", category: "展示・PR", status: "営業中", owner: "担当者 I", phone: "090-0000-0009", checks: 4, x: 36, y: 70, w: 15, h: 12, rotate: 1 },
  { id: "P-02", name: "PRブース 02", category: "展示・PR", status: "搬入中", owner: "担当者 J", phone: "090-0000-0010", checks: 2, x: 18, y: 66, w: 15, h: 12, rotate: -1 },
  { id: "F-03", name: "飲食ブース 03", category: "飲食", status: "営業中", owner: "担当者 K", phone: "090-0000-0011", checks: 4, x: 7, y: 49, w: 14, h: 12, rotate: 2 },
  { id: "K-05", name: "キッチンカー 05", category: "フード", status: "営業中", owner: "担当者 L", phone: "090-0000-0012", checks: 4, x: 7, y: 33, w: 13, h: 12, rotate: -1 },
];

const stallPositions = initialStalls.map(({ x, y, w, h, rotate }) => ({ x, y, w, h, rotate }));

const demoEvent: DayConsoleEvent = {
  id: "demo",
  title: "みなとまちフードフェア（デモ）",
  startsAt: "2026-07-28T10:00:00+09:00",
  endsAt: "2026-07-28T16:00:00+09:00",
  address: "サンプル会場",
  isDemo: true,
  stalls: initialStalls.map(({ id, name, category, owner, phone }) => ({ id, name, category, owner, phone })),
};

function hydrateStalls(event: DayConsoleEvent): Stall[] {
  if (event.isDemo) return initialStalls;
  return event.stalls.map((stall, index) => ({
    ...stall,
    status: "未到着",
    checks: 0,
    ...stallPositions[index % stallPositions.length],
  }));
}

const statusOrder: StallStatus[] = ["未到着", "搬入中", "営業中", "終了", "トラブル"];

const navItems = [
  ["overview", "⌂", "当日ダッシュボード"],
  ["map", "▦", "会場マップ"],
  ["vendors", "◎", "出店者管理"],
  ["broadcast", "◉", "全体配信"],
  ["attention", "!", "要対応"],
  ["checklist", "✓", "運営チェック"],
  ["timeline", "↳", "タイムライン"],
];

const timeline = [
  { time: "07:00", minutes: 420, title: "運営集合・朝礼" },
  { time: "07:30", minutes: 450, title: "出店者搬入開始" },
  { time: "09:30", minutes: 570, title: "搬入完了・車両退出" },
  { time: "10:00", minutes: 600, title: "一般開場" },
  { time: "15:30", minutes: 930, title: "ラストオーダー案内" },
  { time: "16:00", minutes: 960, title: "営業終了・撤収開始" },
];

const formatRemaining = (minutes: number) => {
  if (minutes < 60) return `あと${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `あと${hours}時間${rest}分` : `あと${hours}時間`;
};

export default function DayConsole({ events, operatorName }: DayConsoleProps) {
  const router = useRouter();
  const availableEvents = events.length ? events : [demoEvent];
  const [eventId, setEventId] = useState(availableEvents[0].id);
  const activeEvent = availableEvents.find((event) => event.id === eventId) ?? availableEvents[0];
  const [stalls, setStalls] = useState(() => hydrateStalls(activeEvent));
  const [activeNav, setActiveNav] = useState("overview");
  const [filter, setFilter] = useState<StallStatus | "すべて">("すべて");
  const [selected, setSelected] = useState<Stall | null>(null);
  const [panel, setPanel] = useState<"detail" | "chat" | "broadcast" | "notifications" | "mapImport" | null>(null);
  const [toast, setToast] = useState("");
  const [broadcastText, setBroadcastText] = useState("");
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<{ text: string; sender: "vendor" | "organizer"; time: string }[]>([
    { text: "搬入経路は海側ゲートで合っていますか？", sender: "vendor", time: "09:18" },
    { text: "はい、海側ゲートからお入りください。スタッフが誘導します。", sender: "organizer", time: "09:21" },
  ]);
  const [resolved, setResolved] = useState<string[]>([]);
  const [completedChecks, setCompletedChecks] = useState([true, true, false, true]);
  const [mapFile, setMapFile] = useState("会場レイアウト_サンプル.pdf");
  const [mapAnalyzing, setMapAnalyzing] = useState(false);
  const [mapConfirmed, setMapConfirmed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const tokyoTimeParts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(tokyoTimeParts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(tokyoTimeParts.find((part) => part.type === "minute")?.value ?? 0);
  const currentMinutes = hour * 60 + minute;
  const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(now);
  const activeTimelineIndex = timeline.reduce(
    (latest, item, index) => currentMinutes >= item.minutes ? index : latest,
    0,
  );
  const arrivalDeadlinePassed = currentMinutes >= 570;

  const counts = useMemo(() => {
    return statusOrder.reduce<Record<string, number>>((acc, status) => {
      acc[status] = stalls.filter((stall) => stall.status === status).length;
      return acc;
    }, {});
  }, [stalls]);

  const filteredStalls = filter === "すべて" ? stalls : stalls.filter((stall) => stall.status === filter);
  const totalStalls = stalls.length;
  const arrivedCount = stalls.filter((stall) => stall.status !== "未到着").length;
  const attentionStalls = stalls.filter((stall) => stall.status === "未到着" || stall.status === "トラブル");
  const attentionCount = activeEvent.isDemo ? 3 - resolved.length : attentionStalls.length;
  const eventDate = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(activeEvent.startsAt));
  const eventEndTime = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(activeEvent.endsAt));
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  const updateStatus = (id: string, status: StallStatus) => {
    setStalls((current) => current.map((stall) => (stall.id === id ? { ...stall, status } : stall)));
    setSelected((current) => (current?.id === id ? { ...current, status } : current));
    showToast(`${id} のステータスを「${status}」に更新しました`);
  };

  const openStall = (stall: Stall) => {
    setSelected(stall);
    setPanel("detail");
  };

  const runMapAnalysis = () => {
    setMapAnalyzing(true);
    window.setTimeout(() => {
      setMapAnalyzing(false);
      setMapConfirmed(false);
      setPanel(null);
      showToast(`${totalStalls}区画と6設備を抽出しました`);
      document.getElementById("venue-map")?.scrollIntoView({ behavior: "smooth" });
    }, 1400);
  };

  const jumpTo = (id: string) => {
    setActiveNav(id);
    if (id === "map" || id === "vendors") {
      document.getElementById("venue-map")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "attention") {
      document.getElementById("attention-queue")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "checklist") {
      document.getElementById("checklist")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "timeline") {
      document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" });
    } else if (id === "broadcast") {
      setPanel("broadcast");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="day-console-page"><div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <div><strong>FestMatch</strong><small>DAY CONTROL</small></div>
        </div>
        <div className="event-mini">
          <span className="live-dot" />
          <div><b>{activeEvent.isDemo ? "デモ表示" : "当日運営"}</b><small>{activeEvent.title}</small></div>
        </div>
        <nav>
          {navItems.map(([id, icon, label]) => (
            <button key={id} className={activeNav === id ? "active" : ""} onClick={() => jumpTo(id)}>
              <span>{icon}</span>{label}
              {id === "attention" && <em>3</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => router.push("/organizer")}>← 通常モードへ戻る</button>
          <div className="operator"><span>{operatorName.slice(0, 2).toUpperCase()}</span><div><b>{operatorName}</b><small>主催者管理者</small></div></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">F</span><b>DAY CONTROL</b></div>
          <label className="event-select">
            <span>イベント</span>
            <select value={eventId} onChange={(e) => {
              const nextEvent = availableEvents.find((event) => event.id === e.target.value);
              if (!nextEvent) return;
              setEventId(nextEvent.id);
              setStalls(hydrateStalls(nextEvent));
              setSelected(null);
              setResolved([]);
              showToast("イベントを切り替えました");
            }}>
              {availableEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </label>
          <div className="top-actions">
            <div className="clock"><b>{timeLabel}</b><span>{dateLabel}</span></div>
            <div className="weather"><span>☀</span><div><b>29°C</b><small>降水 10%</small></div></div>
            <button className="announce" onClick={() => setPanel("broadcast")}>＋ 一斉アナウンス</button>
            <button className="icon-button notification-button" aria-label="通知" onClick={() => setPanel("notifications")}>●<i>3</i></button>
          </div>
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <div className="eyebrow"><span className="live-dot" /> LIVE OPERATION</div>
              <h1>{activeEvent.title}</h1>
              <p>{eventDate}–{eventEndTime} · {activeEvent.address}{activeEvent.isDemo ? " · 本番データ未登録のためデモ表示" : ""}</p>
            </div>
            <button className="ghost-button" onClick={() => activeEvent.slug ? router.push(`/festmap/events/${activeEvent.slug}`) : showToast("このイベントはまだ公開されていません")}>公開ページを見る ↗</button>
          </section>

          <section className="metrics">
            <article>
              <div className="metric-top"><span className="metric-icon green">✓</span><small>到着済み</small></div>
              <div className="metric-value"><b>{arrivedCount}</b><span>/ {totalStalls}区画</span></div>
              <div className="progress"><i style={{ width: `${totalStalls ? (arrivedCount / totalStalls) * 100 : 0}%` }} /></div>
              <p>{arrivalDeadlinePassed ? `搬入締切を経過 · 未到着${counts["未到着"]}台` : `残り${counts["未到着"]}台 · ${formatRemaining(570 - currentMinutes)}`}</p>
            </article>
            <article>
              <div className="metric-top"><span className="metric-icon orange">▣</span><small>営業中</small></div>
              <div className="metric-value"><b>{counts["営業中"]}</b><span>/ {totalStalls}店舗</span></div>
              <div className="progress orange-bar"><i style={{ width: `${totalStalls ? (counts["営業中"] / totalStalls) * 100 : 0}%` }} /></div>
              <p>{counts["搬入中"]}店舗が準備中</p>
            </article>
            <article className="danger-card">
              <div className="metric-top"><span className="metric-icon red">!</span><small>要対応</small></div>
              <div className="metric-value"><b>{attentionCount}</b><span>件</span></div>
              <div className="problem-tags"><span>トラブル {counts["トラブル"]}</span><span>未到着 {counts["未到着"]}</span></div>
              <p>優先対応が必要です</p>
            </article>
            <article>
              <div className="metric-top"><span className="metric-icon blue">☷</span><small>チェック完了率</small></div>
              <div className="metric-value"><b>{Math.round((completedChecks.filter(Boolean).length / completedChecks.length) * 100)}</b><span>%</span></div>
              <div className="progress blue-bar"><i style={{ width: `${(completedChecks.filter(Boolean).length / completedChecks.length) * 100}%` }} /></div>
              <p>{completedChecks.filter(Boolean).length * 9} / 36項目 完了</p>
            </article>
          </section>

          <div className="dashboard-grid">
            <section className="map-card card" id="venue-map">
              <div className="section-head">
                <div><span className="section-kicker">AI VENUE MAP</span><h2>PDFから取り込んだ区画図</h2></div>
                <div className="map-head-actions">
                  <button className="ai-import-button" onClick={() => setPanel("mapImport")}>＋ PDFをAI取り込み</button>
                  <button onClick={() => setMapConfirmed((value) => !value)}>{mapConfirmed ? "確認を再開" : "区画を確認"}</button>
                </div>
              </div>
              <div className={`map-analysis-bar ${mapConfirmed ? "confirmed" : ""}`}>
                <div><span>{mapConfirmed ? "✓" : "AI"}</span><b>{mapConfirmed ? "区画図を確認済み" : "AI解析済み・主催者確認待ち"}</b></div>
                <p>{mapFile}　/　{totalStalls}区画・6設備を検出　/　要確認 2か所</p>
                {!mapConfirmed && <button onClick={() => setMapConfirmed(true)}>この区画図を確定</button>}
              </div>
              <div className="status-filters">
                <button className={filter === "すべて" ? "selected" : ""} onClick={() => setFilter("すべて")}>すべて <b>{totalStalls}</b></button>
                {statusOrder.map((status) => (
                  <button key={status} className={`${filter === status ? "selected" : ""} status-${status}`} onClick={() => setFilter(status)}>
                    <i />{status} <b>{counts[status]}</b>
                  </button>
                ))}
              </div>
              <div className="venue imported-venue">
                <div className="source-paper-head"><b>会場レイアウト図</b><span>※デモ用に固有名詞を匿名化しています</span></div>
                <div className="paper-road road-top">搬入経路</div>
                <div className="paper-road road-side">歩行者通路</div>
                <div className="paper-facility facility-stage">ステージ</div>
                <div className="paper-facility facility-office">運営本部</div>
                <div className="paper-facility facility-gate">入場口</div>
                <div className="paper-facility facility-wc">WC</div>
                <div className="paper-tree tree-1">●</div>
                <div className="paper-tree tree-2">●</div>
                <div className="paper-tree tree-3">●</div>
                <div className="stall-overlay">
                  {filteredStalls.map((stall) => (
                    <button
                      key={stall.id}
                      style={{ left: `${stall.x}%`, top: `${stall.y}%`, width: `${stall.w}%`, height: `${stall.h}%`, transform: `rotate(${stall.rotate ?? 0}deg)` }}
                      className={`stall stall-${stall.status} ${mapConfirmed ? "map-confirmed" : ""}`}
                      onClick={() => openStall(stall)}
                    >
                      <span className="stall-status" />
                      <small>{stall.id}</small>
                      <strong>{stall.name}</strong>
                      <em>{stall.category}</em>
                      <i>›</i>
                    </button>
                  ))}
                </div>
                {filteredStalls.length === 0 && <div className="empty map-empty">該当する区画はありません</div>}
                {!mapConfirmed && (
                  <>
                    <button className="ai-question question-1" onClick={() => showToast("K-04をキッチンカー区画として確定しました")}>? 種別を確認</button>
                    <button className="ai-question question-2" onClick={() => showToast("入場口として確定しました")}>? 入口を確認</button>
                  </>
                )}
              </div>
              <div className="map-legend"><span><i className="legend-food" />キッチンカー</span><span><i className="legend-shop" />飲食・物販</span><span><i className="legend-pr" />展示・PR</span><span className="map-hint">区画を選択すると状況更新・チャットを開けます</span></div>
            </section>

            <aside className="right-column">
              <section className="card attention-card" id="attention-queue">
                <div className="section-head compact">
                  <div><span className="section-kicker red-text">ACTION REQUIRED</span><h2>要対応</h2></div>
                  <button onClick={() => jumpTo("attention")}>すべて見る</button>
                </div>
                <div className="attention-list">
                  {activeEvent.isDemo && !resolved.includes("power") && (
                    <article className="urgent">
                      <span>!</span>
                      <div><b>F-02 飲食ブース 02</b><p>電源が入らないと報告</p><small>3分前 · トラブル</small></div>
                      <button onClick={() => { const stall = stalls.find((s) => s.id === "F-02")!; setSelected(stall); setPanel("chat"); }}>対応</button>
                    </article>
                  )}
                  {activeEvent.isDemo && !resolved.includes("arrival") && (
                    <article>
                      <span>↳</span>
                      <div><b>K-04 キッチンカー 04</b><p>搬入締切まで24分・未到着</p><small>連絡未確認</small></div>
                      <button onClick={() => { setResolved((r) => [...r, "arrival"]); showToast("電話連絡済みにしました"); }}>連絡</button>
                    </article>
                  )}
                  {activeEvent.isDemo && !resolved.includes("message") && (
                    <article>
                      <span>●</span>
                      <div><b>P-02 PRブース 02</b><p>新しいメッセージがあります</p><small>8分前 · 未読</small></div>
                      <button onClick={() => { const stall = stalls.find((s) => s.id === "P-02")!; setSelected(stall); setPanel("chat"); setResolved((r) => [...r, "message"]); }}>開く</button>
                    </article>
                  )}
                  {activeEvent.isDemo && resolved.length === 3 && <div className="all-clear">✓ すべて対応済みです</div>}
                  {!activeEvent.isDemo && attentionStalls.slice(0, 4).map((stall) => (
                    <article className={stall.status === "トラブル" ? "urgent" : ""} key={stall.id}>
                      <span>{stall.status === "トラブル" ? "!" : "↳"}</span>
                      <div><b>{stall.id} {stall.name}</b><p>{stall.status === "トラブル" ? "現場での確認が必要です" : "到着確認がまだ完了していません"}</p><small>{stall.status}</small></div>
                      <button onClick={() => openStall(stall)}>開く</button>
                    </article>
                  ))}
                  {!activeEvent.isDemo && attentionStalls.length === 0 && <div className="all-clear">✓ 現在、要対応はありません</div>}
                </div>
              </section>

              <section className="card timeline-card" id="timeline">
                <div className="section-head compact">
                  <div><span className="section-kicker">TODAY</span><h2>進行タイムライン</h2></div>
                  <button onClick={() => showToast("タイムライン編集を開きました")}>編集</button>
                </div>
                <div className="timeline">
                  {timeline.map((item, index) => {
                    const done = index < activeTimelineIndex;
                    const active = index === activeTimelineIndex;
                    const next = timeline[index + 1];
                    const meta = done
                      ? "完了"
                      : active
                        ? next ? `進行中 · ${formatRemaining(Math.max(0, next.minutes - currentMinutes))}` : "進行中"
                        : formatRemaining(Math.max(0, item.minutes - currentMinutes));
                    return (
                    <div key={item.time} className={`${done ? "done" : ""} ${active ? "current" : ""}`}>
                      <time>{item.time}</time><i />
                      <div><b>{item.title}</b><small>{meta}</small></div>
                    </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>

          <section className="bottom-grid">
            <div className="card checklist-card" id="checklist">
              <div className="section-head compact">
                <div><span className="section-kicker">OPERATIONS</span><h2>運営チェックリスト</h2></div>
                <button onClick={() => showToast("全チェックリストを開きました")}>全36項目</button>
              </div>
              <div className="check-progress"><span>本日の完了状況</span><b>{completedChecks.filter(Boolean).length} / {completedChecks.length}</b></div>
              {["受付・本部設営", "搬入口の誘導員配置", "保健所許可証の掲示確認", "電源・消火器の設置確認"].map((label, index) => (
                <label className="check-row" key={label}>
                  <input type="checkbox" checked={completedChecks[index]} onChange={() => {
                    setCompletedChecks((current) => current.map((value, i) => i === index ? !value : value));
                  }} />
                  <span>{label}</span><small>{index < 2 ? "運営本部" : "全区画"}</small>
                </label>
              ))}
            </div>
            <div className="card broadcast-card">
              <div className="broadcast-art">◉</div>
              <div><span className="section-kicker">BROADCAST</span><h2>全出店者へ一斉連絡</h2><p>搬入案内、開場・撤収連絡を全店舗へ即時配信します。既読状況も確認できます。</p></div>
              <button onClick={() => setPanel("broadcast")}>メッセージを作成</button>
            </div>
          </section>
        </div>
      </main>

      {panel && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setPanel(null); }}>
          <aside className="drawer">
            <button className="drawer-close" onClick={() => setPanel(null)} aria-label="閉じる">×</button>
            {panel === "detail" && selected && (
              <>
                <span className="drawer-label">区画 {selected.id}</span>
                <h2>{selected.name}</h2>
                <p className="drawer-sub">{selected.category} · 担当 {selected.owner}</p>
                <div className={`current-status stall-${selected.status}`}><i />現在：{selected.status}</div>
                <h3>ステータスを更新</h3>
                <div className="status-options">
                  {statusOrder.map((status) => <button className={selected.status === status ? "current" : ""} key={status} onClick={() => updateStatus(selected.id, status)}>{status}</button>)}
                </div>
                <div className="detail-grid">
                  <div><small>運営チェック</small><b>{selected.checks} / 4 完了</b></div>
                  <div><small>連絡先</small><b>{selected.phone}</b></div>
                </div>
                <div className="drawer-actions">
                  <button className="secondary" onClick={() => showToast(`${selected.owner}へ電話を発信します`)}>電話する</button>
                  <button className="primary" onClick={() => setPanel("chat")}>チャットを開く</button>
                </div>
              </>
            )}
            {panel === "chat" && selected && (
              <>
                <span className="drawer-label">{selected.id} · 個別チャット</span>
                <h2>{selected.name}</h2>
                <p className="drawer-sub">{selected.owner}さんと主催者の会話</p>
                <div className="messages">
                  {messages.map((message, index) => (
                    <p key={`${message.text}-${index}`} className={message.sender === "organizer" ? "mine" : "theirs"}>
                      {message.text}
                      <small>{message.sender === "organizer" ? "主催者" : "出店者"} · {message.time}</small>
                    </p>
                  ))}
                </div>
                <form className="composer" onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatText.trim()) return;
                  const now = new Date();
                  setMessages((m) => [...m, {
                    text: chatText,
                    sender: "organizer",
                    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
                  }]);
                  setChatText("");
                  showToast("メッセージを送信しました");
                }}>
                  <textarea value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="メッセージを入力" />
                  <button type="submit">送信</button>
                </form>
                {selected.status === "トラブル" && <button className="resolve-button" onClick={() => { updateStatus(selected.id, "営業中"); setResolved((r) => [...r, "power"]); setPanel("detail"); }}>トラブルを解決済みにする</button>}
              </>
            )}
            {panel === "mapImport" && (
              <>
                <span className="drawer-label">AI MAP IMPORT</span>
                <h2>区画図をAI取り込み</h2>
                <p className="drawer-sub">PDF・画像をそのまま読み込み、区画と設備をクリック可能な状態にします。</p>
                <label className="map-dropzone">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => setMapFile(e.target.files?.[0]?.name ?? "会場レイアウト_サンプル.pdf")}
                  />
                  <span>PDF</span>
                  <b>{mapFile}</b>
                  <small>PDF・JPG・PNG・WebP / 20MBまで</small>
                  <em>ファイルを選択</em>
                </label>
                <div className="ai-read-list">
                  <div><i>1</i><span><b>文字・色・図形を解析</b><small>区画番号や色分けを読み取ります</small></span></div>
                  <div><i>2</i><span><b>区画と設備を自動抽出</b><small>入口・通路・本部・ステージ等を判定します</small></span></div>
                  <div><i>3</i><span><b>主催者が最終確認</b><small>自信のない箇所だけ質問表示します</small></span></div>
                </div>
                <div className="privacy-note"><b>デモ表示について</b><p>取り込み後の画面では、元資料の固有名詞をデモ用の仮名へ置換して表示します。</p></div>
                <button className="send-broadcast analyze-button" disabled={mapAnalyzing} onClick={runMapAnalysis}>
                  {mapAnalyzing ? "AIが区画を解析中…" : "AI解析を開始"}
                </button>
              </>
            )}
            {panel === "broadcast" && (
              <>
                <span className="drawer-label">BROADCAST</span>
                <h2>一斉アナウンス</h2>
                <p className="drawer-sub">このイベントの全出店者{totalStalls}店舗へ配信します。</p>
                <div className="template-buttons">
                  {["まもなく開場します", "搬入を完了してください", "撤収開始のお知らせ"].map((text) => <button key={text} onClick={() => setBroadcastText(text)}>{text}</button>)}
                </div>
                <label className="broadcast-input">配信内容<textarea value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} placeholder="全出店者への連絡内容を入力してください" /></label>
                <label className="ack-toggle"><input type="checkbox" defaultChecked />「了解しました」の回答を求める</label>
                <button className="send-broadcast" disabled={!broadcastText.trim()} onClick={() => { showToast(`${totalStalls}店舗へ一斉配信しました`); setPanel(null); setBroadcastText(""); }}>{totalStalls}店舗へ配信する</button>
                <div className="recent-broadcast"><small>直近の配信 · 08:42</small><p>搬入は海側ゲートからお願いします。9:30までに車両の退出を完了してください。</p><b>既読 {Math.max(0, totalStalls - 2)} / {totalStalls} · 了解 {Math.max(0, totalStalls - 3)} / {totalStalls}</b></div>
              </>
            )}
            {panel === "notifications" && (
              <>
                <span className="drawer-label">NOTIFICATIONS</span>
                <h2>通知</h2>
                <p className="drawer-sub">未確認の連絡が{attentionCount}件あります。</p>
                <div className="notification-list">
                  {activeEvent.isDemo ? <>
                    <button onClick={() => { const stall = stalls.find((s) => s.id === "F-02"); if (stall) { setSelected(stall); setPanel("chat"); } }}><i className="red-dot" /><div><b>飲食ブース 02からトラブル報告</b><p>電源が入らないため確認をお願いします</p><small>3分前</small></div><span>›</span></button>
                    <button onClick={() => { const stall = stalls.find((s) => s.id === "P-02"); if (stall) { setSelected(stall); setPanel("chat"); } }}><i /><div><b>PRブース 02からメッセージ</b><p>搬入時間について確認があります</p><small>8分前</small></div><span>›</span></button>
                    <button onClick={() => { setPanel(null); jumpTo("timeline"); }}><i /><div><b>搬入締切まで24分</b><p>未到着の店舗が1件あります</p><small>11分前</small></div><span>›</span></button>
                  </> : attentionStalls.slice(0, 5).map((stall) => (
                    <button key={stall.id} onClick={() => openStall(stall)}><i className={stall.status === "トラブル" ? "red-dot" : ""} /><div><b>{stall.id} {stall.name}</b><p>{stall.status === "トラブル" ? "現場での確認が必要です" : "到着確認がまだ完了していません"}</p><small>{stall.status}</small></div><span>›</span></button>
                  ))}
                </div>
                <button className="mark-read" onClick={() => { showToast("すべて既読にしました"); setPanel(null); }}>すべて既読にする</button>
              </>
            )}
          </aside>
        </div>
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </div></div>
  );
}
