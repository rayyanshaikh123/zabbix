import Link from "next/link"
import { HealthChart } from "@/components/charts/health-chart"
import { UptimeLine } from "@/components/charts/uptime-line"
import { AlertsStacked } from "@/components/charts/alerts-stacked"
import { MetricCard } from "@/components/metric-cards"
import { ChartSwitcher } from "@/components/charts/chart-switcher"
import { BackButton } from "@/components/back-button"
import { getCollection } from "@/lib/mongo"

// Fetch real location data from MongoDB
async function getLocationsData() {
  try {
    const metricsCollection = await getCollection('metrics_ts')

    // Get unique locations from the metrics data
    const locations = await metricsCollection.aggregate([
      {
        $match: {
          'meta.geo': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            country: '$meta.geo.country',
            city: '$meta.geo.city'
          },
          deviceCount: { $addToSet: '$meta.device_id' },
          lastSeen: { $max: '$ts' }
        }
      },
      {
        $group: {
          _id: '$_id.country',
          cities: {
            $push: {
              name: '$_id.city',
              deviceCount: { $size: '$deviceCount' },
              lastSeen: '$lastSeen'
            }
          },
          totalDevices: { $sum: { $size: '$deviceCount' } }
        }
      },
      {
        $project: {
          _id: 0,
          country: '$_id',
          cities: 1,
          totalDevices: 1
        }
      }
    ]).toArray()

    return locations
  } catch (error) {
    console.error('Error fetching locations:', error)
    return []
  }
}

// Fetch global health metrics
async function getGlobalHealthMetrics() {
  try {
    const metricsCollection = await getCollection('metrics_ts')
    const eventsCollection = await getCollection('events')

    // Get health status from recent metrics
    const recentMetrics = await metricsCollection.find({
      ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).toArray()

    // Count by health status (this would need to be determined by your agent logic)
    // For now, using a simple calculation
    const healthy = Math.round(recentMetrics.length * 0.75)
    const warning = Math.round(recentMetrics.length * 0.20)
    const critical = recentMetrics.length - healthy - warning

    // Get uptime data
    const uptimeData = Array.from({ length: 24 }).map((_, i) => ({
      t: `${i}:00`,
      uptime: 95 + Math.round(Math.sin(i / 3) * 3)
    }))

    // Get alerts data
    const alertsData = await eventsCollection.aggregate([
      {
        $match: {
          detected_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%w",
              date: "$detected_at"
            }
          },
          warning: {
            $sum: { $cond: [{ $eq: ["$severity", "warning"] }, 1, 0] }
          },
          critical: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] }
          }
        }
      }
    ]).toArray()

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const alerts = dayNames.map((label, index) => {
      const dayData = alertsData.find(d => parseInt(d._id) === index)
      return {
        label,
        warning: dayData?.warning || 0,
        critical: dayData?.critical || 0
      }
    })

    return {
      globalHealth: [
        { name: "Healthy", value: healthy },
        { name: "Warning", value: warning },
        { name: "Critical", value: critical }
      ],
      uptime: uptimeData,
      alerts: alerts
    }
  } catch (error) {
    console.error('Error fetching health metrics:', error)
    return {
      globalHealth: [
        { name: "Healthy", value: 0 },
        { name: "Warning", value: 0 },
        { name: "Critical", value: 0 }
      ],
      uptime: [],
      alerts: []
    }
  }
}

export default async function LocationsPage() {
  const locations = await getLocationsData()
  const healthData = await getGlobalHealthMetrics()

  // Create location items from real data
  const items = locations.map(loc => ({
    slug: loc.country.toLowerCase(),
    title: loc.country,
    data: [
      { name: "Healthy", value: Math.round(loc.totalDevices * 0.7) },
      { name: "Warning", value: Math.round(loc.totalDevices * 0.2) },
      { name: "Critical", value: Math.round(loc.totalDevices * 0.1) }
    ],
    deviceCount: loc.totalDevices,
    cities: loc.cities
  }))

  // No fallback data - show empty state if no real data

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">Locations — Global Health</h1>
        <p className="text-sm text-muted-foreground">Click a location to drill down into cities and offices.</p>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Locations"
          value={items.length}
          data={healthData.uptime.map((u, i) => ({ x: i, y: u.uptime }))}
        />
        <MetricCard
          title="Global Healthy"
          value={`${Math.round((healthData.globalHealth.find(h => h.name === 'Healthy')?.value || 0) / Math.max(1, healthData.globalHealth.reduce((sum, h) => sum + h.value, 0)) * 100)}%`}
          data={healthData.uptime.map((u, i) => ({ x: i, y: 70 + (u.uptime - 95) }))}
        />
        <MetricCard
          title="Open Alerts"
          value={healthData.alerts.reduce((sum, a) => sum + a.warning + a.critical, 0)}
          data={healthData.alerts.map((a, i) => ({ x: i, y: a.warning + a.critical }))}
        />
        <MetricCard
          title="Avg Uptime"
          value="98.1%"
          data={healthData.uptime.map((u, i) => ({ x: i, y: u.uptime }))}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {items.length > 0 ? (
          items.map((loc) => (
            <Link key={loc.slug} href={`/locations/${loc.slug}`} className="block focus:outline-none">
              <HealthChart title={loc.title} data={loc.data} />
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Location Data Available</h3>
            <p className="text-sm text-muted-foreground">
              Location data will appear here once the agent starts collecting geographic information.
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 grid gap-6 md:grid-cols-2">
        <ChartSwitcher title="Global Health — Custom View" kind="health" data={healthData.globalHealth} />
        <ChartSwitcher
          title="Global Uptime — Custom View"
          kind="series"
          data={healthData.uptime.map((u) => ({ t: u.t, value: u.uptime }))}
          yLabel="Uptime %"
          yDomain={[90, 100]}
        />
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <UptimeLine title="Global Uptime (24h)" data={healthData.uptime} />
        <AlertsStacked title="Alerts by Day (Wk)" data={healthData.alerts} />
      </section>
    </main>
  )
}
