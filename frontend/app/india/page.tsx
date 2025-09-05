import Link from "next/link"
import { BackButton } from "@/components/back-button"
import { getCollection } from "@/lib/mongo"

// Fetch cities data from MongoDB
async function getIndiaCitiesData() {
  try {
    const metricsCollection = await getCollection('metrics_ts')

    // Get cities in India from the metrics data
    const cities = await metricsCollection.aggregate([
      {
        $match: {
          'meta.geo.country': 'India'
        }
      },
      {
        $group: {
          _id: '$meta.geo.city',
          deviceCount: { $addToSet: '$meta.device_id' },
          lastSeen: { $max: '$ts' },
          metricsCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          deviceCount: { $size: '$deviceCount' },
          lastSeen: 1,
          metricsCount: 1
        }
      },
      {
        $sort: { lastSeen: -1 }
      }
    ]).toArray()

    return cities
  } catch (error) {
    console.error('Error fetching India cities:', error)
    return []
  }
}

export default async function IndiaCitiesPage() {
  const cities = await getIndiaCitiesData()

  // Fallback cities if no data
  const fallbackCities = [
    { name: 'Mumbai', deviceCount: 0, lastSeen: null, metricsCount: 0 },
    { name: 'Delhi', deviceCount: 0, lastSeen: null, metricsCount: 0 },
    { name: 'Pune', deviceCount: 0, lastSeen: null, metricsCount: 0 }
  ]

  const displayCities = cities.length > 0 ? cities : fallbackCities

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">India — Cities</h1>
        <p className="text-sm text-muted-foreground">
          {cities.length > 0 ? 'Real-time monitoring data from your network devices' : 'Sample cities - start your agent to see live data'}
        </p>
      </header>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {displayCities.map((city) => (
            <Link
              key={city.name}
              href={`/india/${city.name.toLowerCase()}`}
              className="block p-4 border rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <h3 className="font-medium text-lg mb-2">{city.name}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Devices: {city.deviceCount}</p>
                <p>Metrics: {city.metricsCount}</p>
                {city.lastSeen && (
                  <p>Last seen: {new Date(city.lastSeen).toLocaleString()}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {cities.length === 0 && (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">No Live Data Yet</h3>
            <p className="text-blue-600">
              Start your Zabbix network agent to see real-time monitoring data from your network devices.
              The agent will populate this page with actual device metrics and health status.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
