"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FestEvent } from "@/lib/festEvents";
import { formatDateRange, escapeHtml } from "@/lib/festDate";

const lanternIcon = (hot: boolean) =>
  L.divIcon({
    className: "lantern-marker-wrap",
    html: `<div class="marker${hot ? " hot" : ""}"><div class="glow"></div><div class="bulb"></div></div>`,
    iconSize: [22, 26],
    iconAnchor: [11, 26],
  });

export default function FestMapView({ events }: { events: FestEvent[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([35.68, 139.6], 9);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);

    const markers: L.Marker[] = [];
    const bounds: L.LatLngExpression[] = [];

    events.forEach((ev) => {
      if (ev.lat == null || ev.lng == null) return;
      const marker = L.marker([ev.lat, ev.lng], { icon: lanternIcon(false) }).addTo(map);
      const link =
        ev.source === "external" && ev.official_url
          ? `<a href="${ev.official_url}" target="_blank" rel="nofollow noopener">公式サイトを見る</a>`
          : `<a href="/festmap/events/${ev.id}">イベント詳細を見る</a>`;
      marker.bindPopup(
        `<div class="map-pop-inner"><div class="when">${formatDateRange(
          ev.start_date,
          ev.end_date
        )}</div><h3>${escapeHtml(ev.title)}</h3><p>${escapeHtml(ev.venue_name)}</p>${link}</div>`
      );
      markers.push(marker);
      bounds.push([ev.lat, ev.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 12 });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [events]);

  return <aside ref={containerRef} className="map-side" aria-label="フェス開催地の地図" />;
}
