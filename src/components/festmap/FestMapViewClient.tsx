"use client";

import dynamic from "next/dynamic";
import type { FestEvent } from "@/lib/festEvents";

// LeafletはSSR不可のため、ssr:falseの動的importはクライアントコンポーネント内で行う
// (Next.js 16ではServer Component内で直接 ssr:false を使えないため)
const FestMapView = dynamic(() => import("./FestMapView"), {
  ssr: false,
  loading: () => <div className="map-loading" />,
});

export default function FestMapViewClient({ events }: { events: FestEvent[] }) {
  return <FestMapView events={events} />;
}
