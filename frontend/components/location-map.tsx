"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import Link from "next/link"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import { useEffect, useMemo } from "react"

type Metrics = { Healthy: number; Warning: number; Critical: number }

export type MapMarker = {
  id: string
  name: string
  position: [number, number]
  metrics: Metrics
  href?: string
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!positions.length) return
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng)))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [positions, map])
  return null
}

function healthColor(m: Metrics) {
  if (m.Critical >= 10) return "hsl(var(--crit))"
  if (m.Warning >= 20) return "hsl(var(--warn))"
  return "hsl(var(--ok))"
}

function pct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function LocationMap({
  markers,
  className = "",
  initialZoom = 5,
}: {
  markers: MapMarker[]
  className?: string
  initialZoom?: number
}) {
  const center = useMemo<[number, number]>(() => {
    if (!markers.length) return [20.5937, 78.9629] // India fallback
    const avgLat = markers.reduce((a, m) => a + m.position[0], 0) / markers.length
    const avgLng = markers.reduce((a, m) => a + m.position[1], 0) / markers.length
    return [avgLat, avgLng]
  }, [markers])

  const positions = markers.map((m) => m.position)

  return (
    <div className={`w-full overflow-hidden rounded-xl border bg-background ${className}`}>
      <MapContainer
        center={center}
        zoom={initialZoom}
        className="h-[320px] w-full md:h-[480px]"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds positions={positions} />
        {markers.map((m) => {
          const fill = healthColor(m.metrics)
          const total = m.metrics.Healthy + m.metrics.Warning + m.metrics.Critical || 1
          const H = pct((m.metrics.Healthy / total) * 100)
          const W = pct((m.metrics.Warning / total) * 100)
          const C = pct((m.metrics.Critical / total) * 100)

          return (
            <CircleMarker
              key={m.id}
              center={m.position}
              radius={10}
              pathOptions={{ color: fill, fillColor: fill, fillOpacity: 0.85, weight: 2 }}
            >
              <Popup>
                <div className="w-56">
                  <div className="mb-1 text-sm font-semibold">{m.name}</div>

                  {/* mini stacked bar to show health mix */}
                  <div className="mb-2 flex h-2 w-full overflow-hidden rounded">
                    <div style={{ width: `${H}%`, background: "hsl(var(--ok))" }} aria-label="Healthy segment" />
                    <div style={{ width: `${W}%`, background: "hsl(var(--warn))" }} aria-label="Warning segment" />
                    <div style={{ width: `${C}%`, background: "hsl(var(--crit))" }} aria-label="Critical segment" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span
                        className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ background: "hsl(var(--ok))" }}
                      />
                      Healthy {H}%
                    </div>
                    <div>
                      <span
                        className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ background: "hsl(var(--warn))" }}
                      />
                      Warning {W}%
                    </div>
                    <div>
                      <span
                        className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ background: "hsl(var(--crit))" }}
                      />
                      Critical {C}%
                    </div>
                  </div>

                  {m.href ? (
                    <Link href={m.href} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
                      Open details →
                    </Link>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default LocationMap
