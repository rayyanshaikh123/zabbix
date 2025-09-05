import Link from "next/link"
import { HealthChart } from "@/components/charts/health-chart"
import { LocationSelector } from "@/components/location-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LocationMap, { type MapMarker } from "@/components/map/location-map"
import { BackButton } from "@/components/back-button"

const sample: Record<string, Record<string, { Healthy: number; Warning: number; Critical: number }>> = {
  india: {
    mumbai: { Healthy: 66, Warning: 24, Critical: 10 },
    delhi: { Healthy: 71, Warning: 19, Critical: 10 },
    pune: { Healthy: 69, Warning: 21, Critical: 10 },
  },
  japan: {
    tokyo: { Healthy: 80, Warning: 14, Critical: 6 },
  },
  toronto: {
    toronto: { Healthy: 74, Warning: 18, Critical: 8 },
  },
}

const cityCoords: Record<string, [number, number]> = {
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  pune: [18.5204, 73.8567],
  tokyo: [35.6762, 139.6503],
  toronto: [43.6532, -79.3832],
}

export default function CountryPage({ params }: { params: { country: string } }) {
  const { country } = params
  const cities = Object.entries(sample[country] || {})

  const markers: MapMarker[] = cities.map(([city, m]) => ({
    id: city,
    name: city[0].toUpperCase() + city.slice(1),
    position: cityCoords[city] || [20.5937, 78.9629],
    metrics: m,
    href: `/locations/${country}/${city}`,
  }))

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">
          {country[0].toUpperCase() + country.slice(1)} — City Health
        </h1>
        <LocationSelector initial={{ country }} />
      </header>

      <Tabs defaultValue="cards" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="m-0">
          <section className="grid gap-6 md:grid-cols-3">
            {cities.map(([city, m]) => (
              <Link key={city} href={`/locations/${country}/${city}`} className="block">
                <HealthChart
                  title={city[0].toUpperCase() + city.slice(1)}
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
