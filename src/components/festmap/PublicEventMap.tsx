'use client'

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { lanternMarker } from "@/components/map/LanternMarker"

export type PublicMapEvent = { id: string; title: string; latitude: number | null; longitude: number | null }

export default function PublicEventMap({ events, className = "public-map" }: { events: PublicMapEvent[]; className?: string }) {
  const node = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!node.current) return
    let disposed = false; let map: import("leaflet").Map | undefined
    void import("leaflet").then((L) => {
      if (disposed || !node.current) return
      const positioned = events.filter((event): event is PublicMapEvent & { latitude: number; longitude: number } => event.latitude != null && event.longitude != null)
      const origin = positioned[0] ?? { latitude: 35.6812, longitude: 139.7671 }
      map = L.map(node.current, { scrollWheelZoom: false }).setView([origin.latitude, origin.longitude], positioned.length ? 9 : 5)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map)
      const bounds: import("leaflet").LatLngExpression[] = []
      positioned.forEach((event) => { const marker = L.marker([event.latitude, event.longitude], { icon: lanternMarker(L) }).addTo(map!); const content = document.createElement("strong"); content.textContent = event.title; marker.bindPopup(content); bounds.push([event.latitude, event.longitude]) })
      if (bounds.length > 1) map.fitBounds(bounds as import("leaflet").LatLngBoundsExpression, { padding: [28, 28], maxZoom: 12 })
    })
    return () => { disposed = true; map?.remove() }
  }, [events])
  return <div ref={node} className={className} aria-label="イベント会場の地図" />
}
