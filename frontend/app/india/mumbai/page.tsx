import Link from "next/link"
import { BackButton } from "@/components/back-button"
import { getCollection } from "@/lib/mongo"

// Fetch Mumbai offices data from MongoDB
async function getMumbaiOfficesData() {
  try {
    const metricsCollection = await getCollection('metrics_ts')

    // Get offices in Mumbai from the metrics data
    const offices = await metricsCollection.aggregate([
      {
        $match: {
          'meta.geo.country': 'India',
          'meta.geo.city': 'Mumbai'
        }
      },
      {
        $group: {
          _id: '$meta.device_id',
          lastSeen: { $max: '$ts' },
          metricsCount: { $sum: 1 },
          interfaces: { $addToSet: '$meta.ifindex' }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          lastSeen: 1,
          metricsCount: 1,
          interfaceCount: {
            $size: {
              $filter: {
                input: '$interfaces',
                cond: { $ne: ['$$this', null] }
              }
            }
          }
        }
      },
      {
        $sort: { lastSeen: -1 }
      }
    ]).toArray()

    return offices
  } catch (error) {
    console.error('Error fetching Mumbai offices:', error)
    return []
  }
}

export default async function MumbaiOfficesPage() {
  const offices = await getMumbaiOfficesData()

  // Fallback offices if no data
  const fallbackOffices = [
    { name: 'Jogeshwari Office', lastSeen: null, metricsCount: 0, interfaceCount: 0 },
    { name: 'Churchgate Office', lastSeen: null, metricsCount: 0, interfaceCount: 0 }
  ]

  const displayOffices = offices.length > 0 ? offices : fallbackOffices

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">Mumbai — Offices</h1>
        <p className="text-sm text-muted-foreground">
          {offices.length > 0 ? 'Real-time monitoring data from your network devices' : 'Sample offices - start your agent to see live data'}
        </p>
      </header>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {displayOffices.map((office, index) => (
            <Link
              key={office.name || `office-${index}`}
              href={`/locations/india/mumbai/${office.name?.toLowerCase().replace(/\s+/g, '-') || `office-${index}`}`}
              className="block p-4 border rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <h3 className="font-medium text-lg mb-2">{office.name || `Office ${index + 1}`}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Interfaces: {office.interfaceCount || 0}</p>
                <p>Metrics: {office.metricsCount || 0}</p>
                {office.lastSeen && (
                  <p>Last seen: {new Date(office.lastSeen).toLocaleString()}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {offices.length === 0 && (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">No Live Data Yet</h3>
            <p className="text-blue-600">
              Start your Zabbix network agent to see real-time monitoring data from your Mumbai offices.
              The agent will populate this page with actual device metrics and health status.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
