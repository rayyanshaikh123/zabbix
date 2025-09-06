import Link from "next/link"
import { HealthChart } from "@/components/charts/health-chart"
import { UptimeLine } from "@/components/charts/uptime-line"
import { AlertsStacked } from "@/components/charts/alerts-stacked"
import { MetricCard } from "@/components/metric-cards"
import { ChartSwitcher } from "@/components/charts/chart-switcher"
import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, MapPin, Server } from "lucide-react"

interface LocationHealth {
  location: string;
  hierarchy: {
    country: string;
    city: string;
    office: string;
    fullPath: string;
  };
  deviceCount: number;
  healthyDevices: number;
  warningDevices: number;
  criticalDevices: number;
  lastSeen: Date | null;
  deviceDistribution: {
    switches: number;
    routers: number;
    pcs: number;
    interfaces: number;
    other: number;
  };
  devices: {
    hostid: string;
    device_id: string;
    status: string;
    severity: string;
    last_seen: Date;
    deviceType: string;
  }[];
}

interface HierarchicalLocation {
  level: 'country' | 'city' | 'office';
  name: string;
  path: string;
  deviceCount: number;
  healthyDevices: number;
  warningDevices: number;
  criticalDevices: number;
  lastSeen: Date | null;
  children: HierarchicalLocation[];
  deviceDistribution?: {
    switches: number;
    routers: number;
    pcs: number;
    interfaces: number;
    other: number;
  };
}

// Fetch location data from API
async function getLocationsData(): Promise<{ count: number; locations: LocationHealth[]; hierarchy: HierarchicalLocation[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/locations`, {
      cache: 'no-store',
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching locations:', error);
    return { count: 0, locations: [], hierarchy: [], error: error instanceof Error ? error.message : 'Failed to fetch locations' };
  }
}

// Fetch global health metrics from API
async function getGlobalHealthMetrics(): Promise<{ count: number; alerts: any[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/alerts?limit=100`, {
      cache: 'no-store',
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching global health metrics:', error);
    return { count: 0, alerts: [], error: error instanceof Error ? error.message : 'Failed to fetch global health metrics' };
  }
}

function getStatusBadge(status: string, severity: string) {
  if (severity === 'critical') {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
  }
  if (severity === 'warning') {
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Warning</Badge>;
  }
  return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Operational</Badge>;
}

export default async function LocationsPage() {
  const [locationsData, healthData] = await Promise.all([
    getLocationsData(),
    getGlobalHealthMetrics()
  ]);

  const hasConnectionError = locationsData.error || healthData.error;
  const locations = locationsData.locations || [];
  const hierarchy = locationsData.hierarchy || [];
  const alerts = healthData.alerts || [];

  // Calculate global health metrics from alerts
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning').length;
  const totalAlerts = alerts.length;

  // Create hierarchical location items
  const countryItems = hierarchy.map(country => ({
    slug: country.name.toLowerCase().replace(/\s+/g, '-'),
    title: country.name,
    level: 'country' as const,
    data: [
      { name: "Healthy", value: country.healthyDevices },
      { name: "Warning", value: country.warningDevices },
      { name: "Critical", value: country.criticalDevices }
    ],
    deviceCount: country.deviceCount,
    lastSeen: country.lastSeen,
    children: country.children.map(city => ({
      slug: `${country.name.toLowerCase()}-${city.name.toLowerCase()}`.replace(/\s+/g, '-'),
      title: city.name,
      level: 'city' as const,
      data: [
        { name: "Healthy", value: city.healthyDevices },
        { name: "Warning", value: city.warningDevices },
        { name: "Critical", value: city.criticalDevices }
      ],
      deviceCount: city.deviceCount,
      lastSeen: city.lastSeen,
      children: city.children.map(office => ({
        slug: `${country.name.toLowerCase()}-${city.name.toLowerCase()}-${office.name.toLowerCase()}`.replace(/\s+/g, '-'),
        title: office.name,
        level: 'office' as const,
        data: [
          { name: "Healthy", value: office.healthyDevices },
          { name: "Warning", value: office.warningDevices },
          { name: "Critical", value: office.criticalDevices }
        ],
        deviceCount: office.deviceCount,
        lastSeen: office.lastSeen,
        deviceDistribution: office.deviceDistribution
      }))
    }))
  }));

  // Fallback data when no location data found
  const fallbackItems = [
    { 
      slug: "location-not-found", 
      title: "Location Not Found", 
      level: 'country' as const,
      data: [
        { name: "Healthy", value: 0 },
        { name: "Warning", value: 0 },
        { name: "Critical", value: 0 }
      ], 
      deviceCount: 0, 
      lastSeen: null,
      children: []
    }
  ];

  const displayItems = countryItems.length > 0 ? countryItems : fallbackItems;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">Locations — Health Records</h1>
        <p className="text-sm text-muted-foreground">Monitor device health by location. Click a location to view detailed health records.</p>
        {hasConnectionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {locationsData.error || healthData.error}
            </p>
          </div>
        )}
      </header>

      {/* Global Health Overview */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">Monitored locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.reduce((sum, loc) => sum + loc.deviceCount, 0)}</div>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {warningAlerts} warnings, {totalAlerts} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {locations.length > 0 ? 
                Math.round((locations.reduce((sum, loc) => sum + loc.healthyDevices, 0) / 
                Math.max(1, locations.reduce((sum, loc) => sum + loc.deviceCount, 0))) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Devices operational</p>
          </CardContent>
        </Card>
      </section>

      {/* Hierarchical Location Health Records */}
      {displayItems.length > 0 && displayItems.some(loc => loc.deviceCount > 0) ? (
        <section className="space-y-8">
          {displayItems
            .filter(loc => loc.deviceCount > 0) // Only show locations with devices
            .map((country) => (
            <div key={country.slug} className="space-y-4">
              {/* Country Level */}
              <Link href={`/locations/${country.slug}`} className="block">
                <Card className="hover:shadow-lg transition-shadow border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">🌍</span>
                      {country.title}
                    </CardTitle>
                    <CardDescription>
                      {country.deviceCount} devices across {country.children.length} cities • {country.lastSeen ? `Last seen: ${new Date(country.lastSeen).toLocaleString()}` : 'No recent activity'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32">
                      <HealthChart title="" data={country.data} />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Cities Level */}
              {country.children.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 ml-4">
                  {country.children
                    .filter(city => city.deviceCount > 0)
                    .map((city) => (
                    <div key={city.slug} className="space-y-2">
                      <Link href={`/locations/${country.slug}/${city.slug}`} className="block">
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <span className="text-xl">🏙️</span>
                              {city.title}
                            </CardTitle>
                            <CardDescription>
                              {city.deviceCount} devices • {city.children.length} offices
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-24">
                              <HealthChart title="" data={city.data} />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Offices Level */}
                      {city.children.length > 0 && (
                        <div className="grid gap-2 ml-4">
                          {city.children
                            .filter(office => office.deviceCount > 0)
                            .map((office) => (
                            <Link key={office.slug} href={`/locations/${country.slug}/${city.slug}/${office.slug}`} className="block">
                              <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-200">
                                <CardHeader className="py-2">
                                  <CardTitle className="flex items-center gap-2 text-sm">
                                    <span className="text-lg">🏢</span>
                                    {office.title}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {office.deviceCount} devices
                                    {office.deviceDistribution && (
                                      <span className="ml-2">
                                        • {office.deviceDistribution.switches} switches • {office.deviceDistribution.routers} routers • {office.deviceDistribution.pcs} PCs
                                      </span>
                                    )}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="py-2">
                                  <div className="h-16">
                                    <HealthChart title="" data={office.data} />
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ) : (
        <section className="text-center py-12">
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Device Locations Found</h3>
          <p className="text-muted-foreground mb-4">
            No devices with location data were found in the monitoring system.
          </p>
          <p className="text-sm text-muted-foreground">
            Make sure your monitoring agent is collecting location data and sending it to the database.
          </p>
        </section>
      )}

      {/* Global Health Summary - Only show if there are locations with devices */}
      {locations.length > 0 && locations.some(loc => loc.deviceCount > 0) && (
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Global Health Distribution</CardTitle>
              <CardDescription>Health status across all monitored locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <HealthChart 
                  title="Global Health" 
                  data={[
                    { name: "Healthy", value: locations.reduce((sum, loc) => sum + loc.healthyDevices, 0) },
                    { name: "Warning", value: locations.reduce((sum, loc) => sum + loc.warningDevices, 0) },
                    { name: "Critical", value: locations.reduce((sum, loc) => sum + loc.criticalDevices, 0) }
                  ]} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts by Location</CardTitle>
              <CardDescription>Latest alerts from all monitored locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.slice(0, 10).map((alert) => (
                  <div key={alert._id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{alert.device_id}</p>
                      <p className="text-xs text-muted-foreground">{alert.metric}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(alert.status, alert.severity)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.detected_at * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">No recent alerts</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  )
}
