import Link from "next/link"
import { LocationSelector } from "@/components/location-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LocationMap, { type MapMarker } from "@/components/map/location-map"
import { MetricCard } from "@/components/metric-cards"
import { BackButton } from "@/components/back-button"

const sampleOffices: Record<
  string,
  Record<string, Record<string, { Healthy: number; Warning: number; Critical: number }>>
> = {
  india: {
    mumbai: {
      "jogeshwari-office": { Healthy: 61, Warning: 26, Critical: 13 },
      "churchgate-office": { Healthy: 72, Warning: 18, Critical: 10 },
    },
    delhi: {
      "cp-office": { Healthy: 70, Warning: 20, Critical: 10 },
    },
    pune: {
      "magarpatta-office": { Healthy: 69, Warning: 21, Critical: 10 },
    },
  },
}

const officeCoords: Record<string, [number, number]> = {
  "jogeshwari-office": [19.135, 72.848],
  "churchgate-office": [18.9388, 72.8277],
  "cp-office": [28.6315, 77.2167],
  "magarpatta-office": [18.5208, 73.9349],
}

export default function CityPage({ params }: { params: { country: string; city: string } }) {
  const { country, city } = params
  const offices = Object.entries(sampleOffices[country]?.[city] || {})

  const officeMetrics = offices.map(([, m]) => m)
  const officeCount = offices.length
  const avg = (key: "Healthy" | "Warning" | "Critical") =>
    officeCount ? Math.round(officeMetrics.reduce((s, m) => s + m[key], 0) / officeCount) : 0

  const avgHealthy = avg("Healthy")
  const avgWarning = avg("Warning")
  const avgCritical = avg("Critical")

  // small example sparkline data (replace with live series when available)
  const healthySeries = Array.from({ length: 8 }).map((_, i) => ({
    x: i + 1,
    y: Math.max(0, Math.min(100, avgHealthy + (i % 3 === 0 ? -3 : i % 2 === 0 ? 2 : 0))),
  }))
  const warnSeries = Array.from({ length: 8 }).map((_, i) => ({
    x: i + 1,
    y: Math.max(0, Math.min(100, avgWarning + (i % 4 === 0 ? 2 : -1))),
  }))
  const critSeries = Array.from({ length: 8 }).map((_, i) => ({
    x: i + 1,
    y: Math.max(0, Math.min(100, avgCritical + (i % 5 === 0 ? 2 : -1))),
  }))

  const markers: MapMarker[] = offices.map(([office, m]) => ({
    id: office,
    name: office.replace("-", " "),
    position: officeCoords[office] || [19.076, 72.8777],
    metrics: m,
    href: `/locations/${country}/${city}/${office}`,
  }))

  return (
    <main className="mx-auto max-w-6xl p-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Offices" value={officeCount} delta="Live" />
        <MetricCard title="Healthy %" value={`${avgHealthy}%`} data={healthySeries} />
        <MetricCard title="Warning %" value={`${avgWarning}%`} data={warnSeries} />
        <MetricCard title="Critical %" value={`${avgCritical}%`} data={critSeries} />
      </section>

      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">
          {city[0].toUpperCase() + city.slice(1)} — Offices Health
        </h1>
        <LocationSelector initial={{ country, city }} />
      </header>

      <Tabs defaultValue="cards" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="m-0">
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offices.map(([office, m]) => (
              <Link key={office} href={`/locations/${country}/${city}/${office}`} className="block">
                <MetricCard
                  title={office.replace("-", " ")}
                  data={[
                    { name: "Healthy", value: m.Healthy },
                    { name: "Warning", value: m.Warning },
                    { name: "Critical", value: m.Critical },
                  ]}
                />
              </Link>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="map" className="m-0">
          <LocationMap markers={markers} className="mt-1" />
        </TabsContent>
      </Tabs>
    </main>
  )
}
