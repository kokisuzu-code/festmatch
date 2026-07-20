'use client'

import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import { lanternMarker } from "@/components/map/LanternMarker"

type Point = { lat: number; lng: number }

export default function MapLocationPicker({ initialLat, initialLng }: { initialLat?: number | null; initialLng?: number | null }) {
  const initialPoint = initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  const [point, setPoint] = useState<Point | null>(initialPoint)
  const mapNode = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapNode.current) return
    let disposed = false
    let map: import("leaflet").Map | undefined
    void import("leaflet").then((L) => {
      if (disposed || !mapNode.current) return
      const hasInitialPoint = initialLat != null && initialLng != null
      const start = hasInitialPoint ? { lat: initialLat, lng: initialLng } : { lat: 35.6812, lng: 139.7671 }
      map = L.map(mapNode.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], hasInitialPoint ? 13 : 5)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map)
      let marker: import("leaflet").Marker | undefined
      const place = (next: Point) => { marker?.remove(); marker = L.marker([next.lat, next.lng], { icon: lanternMarker(L) }).addTo(map!); setPoint(next) }
      if (hasInitialPoint) marker = L.marker([initialLat, initialLng], { icon: lanternMarker(L) }).addTo(map)
      map.on("click", (event) => place({ lat: event.latlng.lat, lng: event.latlng.lng }))
    })
    return () => { disposed = true; map?.remove() }
  }, [initialLat, initialLng])

  return <div className="map-picker"><div ref={mapNode} className="map-canvas" /><p>地図をクリックすると会場の位置を設定できます。</p><input type="hidden" name="lat" value={point?.lat ?? ""} /><input type="hidden" name="lng" value={point?.lng ?? ""} /></div>
}
