import Link from "next/link"
import { HealthChart } from "@/components/charts/health-chart"
import { LocationSelector } from "@/components/location-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LocationMap, { type MapMarker } from "@/components/map/location-map"
import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, MapPin, Server, Building } from "lucide-react"

interface LocationHealth {
  location: string;
  deviceCount: number;
  healthyDevices: number;
  warningDevices: number;
  criticalDevices: number;
  lastSeen: Date | null;
  devices: {
    hostid: string;
    device_id: string;
    status: string;
    severity: string;
    last_seen: Date;
  }[];
}

// Fetch location data from API
async function getLocationData(country: string): Promise<{ count: number; locations: LocationHealth[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/locations?location=${encodeURIComponent(country)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching location data:', error);
    return { count: 0, locations: [], error: error instanceof Error ? error.message : 'Failed to fetch location data' };
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

export default async function CountryPage({ params }: { params: { country: string } }) {
  const { country } = params
  const locationData = await getLocationData(country)
  
  const hasConnectionError = locationData.error
  const locations = locationData.locations || []
  
  // If no location data found, show "Location Not Found" with fallback data
  const displayLocation = locations.length > 0 ? locations[0] : {
    location: "Location Not Found",
    deviceCount: 0,
    healthyDevices: 0,
    warningDevices: 0,
    criticalDevices: 0,
    lastSeen: null,
    devices: []
  }

  const markers: MapMarker[] = locations.map((loc) => ({
    id: loc.location.toLowerCase().replace(/\s+/g, '-'),
    name: loc.location,
    position: [20.5937, 78.9629], // Default coordinates
    metrics: {
      Healthy: loc.healthyDevices,
      Warning: loc.warningDevices,
      Critical: loc.criticalDevices
    },
    href: `/locations/${country}/${loc.location.toLowerCase().replace(/\s+/g, '-')}`,
  }))

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">
          {displayLocation.location} — Health Records
        </h1>
        <p className="text-sm text-muted-foreground">
          {displayLocation.deviceCount} devices • {displayLocation.lastSeen ? `Last seen: ${new Date(displayLocation.lastSeen).toLocaleString()}` : 'No recent activity'}
        </p>
        {hasConnectionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">{locationData.error}</p>
          </div>
        )}
      </header>

      {/* Location Health Overview - Only show if devices exist */}
      {displayLocation.deviceCount > 0 && (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayLocation.deviceCount}</div>
              <p className="text-xs text-muted-foreground">In this location</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{displayLocation.healthyDevices}</div>
              <p className="text-xs text-muted-foreground">Operational devices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warning</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{displayLocation.warningDevices}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{displayLocation.criticalDevices}</div>
              <p className="text-xs text-muted-foreground">Require immediate action</p>
            </CardContent>
          </Card>
        </section>
      )}

      <Tabs defaultValue="devices" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="devices">Devices</TabsTrigger>
          {displayLocation.deviceCount > 0 && (
            <TabsTrigger value="health">Health Chart</TabsTrigger>
          )}
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Devices in {displayLocation.location}</CardTitle>
              <CardDescription>Detailed health status of all devices in this location</CardDescription>
            </CardHeader>
            <CardContent>
              {displayLocation.devices.length > 0 ? (
                <div className="space-y-3">
                  {displayLocation.devices.map((device) => (
                    <div key={device.hostid} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Server className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{device.device_id}</p>
                          <p className="text-sm text-muted-foreground">ID: {device.hostid}</p>
                          <p className="text-xs text-muted-foreground">
                            Last seen: {new Date(device.last_seen).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(device.status, device.severity)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No devices found in this location</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {displayLocation.location === "Location Not Found" 
                      ? "This location was not found in the monitoring data"
                      : "No devices are currently monitored in this location"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {displayLocation.deviceCount > 0 && (
          <TabsContent value="health" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Health Distribution</CardTitle>
                <CardDescription>Visual representation of device health in {displayLocation.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <HealthChart
                    title={displayLocation.location}
                    data={[
                      { name: "Healthy", value: displayLocation.healthyDevices },
                      { name: "Warning", value: displayLocation.warningDevices },
                      { name: "Critical", value: displayLocation.criticalDevices },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="map" className="m-0">
          {markers.length > 0 ? (
            <LocationMap markers={markers} className="mt-1" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Location Map</CardTitle>
                <CardDescription>Geographic view of {displayLocation.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No location data available for mapping</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
