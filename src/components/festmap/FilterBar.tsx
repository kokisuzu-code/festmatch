import Link from "next/link";

const TAG_CHIPS: { key: string; label: string }[] = [
  { key: "kitchen-car", label: "キッチンカー出店あり" },
  { key: "グルメ", label: "グルメ" },
  { key: "マルシェ", label: "マルシェ" },
  { key: "音楽", label: "音楽" },
  { key: "クラフト", label: "クラフト" },
  { key: "ファミリー向け", label: "ファミリー向け" },
  { key: "入場無料", label: "入場無料" },
  { key: "雨天決行", label: "雨天決行" },
];

export default function FilterBar({
  activeDate,
  activeTag,
  monthLabel,
  basePath = "/festmap",
}: {
  activeDate?: string;
  activeTag?: string;
  monthLabel: string;
  basePath?: string;
}) {
  const isWeekend = activeDate === "weekend";

  const buildHref = (date: string | undefined, tag: string | undefined) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="filters">
      <div className="fwrap">
        <Link className={`chip date${!isWeekend ? " on" : ""}`} href={buildHref(undefined, activeTag)}>
          {monthLabel}
        </Link>
        <Link className={`chip date${isWeekend ? " on" : ""}`} href={buildHref("weekend", activeTag)}>
          今週末
        </Link>
        <div className="fdivider"></div>
        {TAG_CHIPS.map((chip) => {
          const on = activeTag === chip.key;
          return (
            <Link
              key={chip.key}
              className={`chip${on ? " on" : ""}`}
              href={buildHref(activeDate, on ? undefined : chip.key)}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
