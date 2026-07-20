import type L from "leaflet"

export function lanternMarker(leaflet: typeof L) {
  return leaflet.divIcon({
    className: "lantern-map-marker",
    html: '<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17 40c6.6-8 11-13.2 11-22.1C28 10.8 23.1 5 17 5S6 10.8 6 17.9C6 26.8 10.4 32 17 40Z" fill="#D93A2B"/><rect x="10" y="11" width="14" height="14" rx="5" fill="#F5A623"/><path d="M11 7h12M13 27h8" stroke="#FDFBF6" stroke-width="2" stroke-linecap="round"/></svg>',
    iconSize: [34, 42],
    iconAnchor: [17, 40],
  })
}
