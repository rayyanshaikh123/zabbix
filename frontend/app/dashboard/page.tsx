import { MetricCard } from "@/components/metric-cards"
import { LogPanel } from "@/components/log-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Clock, Activity, Server, Wifi, Monitor, TrendingUp, Map, MapPin, Globe, Building, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { HealthChart } from "@/components/charts/health-chart"
import { LocationMapWrapper } from "@/components/map/location-map-wrapper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LeafletMap } from "@/components/leaflet-map"

interface Host {
  hostid: string;
  device_id: string;
  last_seen?: Date;
  interface_count?: number;
  status?: string;
  severity?: string;
}

interface Alert {
  _id: string;
  device_id: string;
  hostid: string;
  iface: string;
  metric: string;
  value: string;
  status: string;
  severity: string;
  detected_at: number;
}

interface Metric {
  _id: string;
  ts: number;
  meta: {
    hostid: string;
    device_id: string;
    ifindex?: string;
    ifdescr?: string;
  };
  metric: string;
  value: number;
  value_type: string;
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

async function getHostsData(): Promise<{ success: boolean; hosts: Host[]; count: number; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hosts/all`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return { success: false, hosts: [], count: 0, error: error instanceof Error ? error.message : 'Failed to fetch hosts' };
  }
}

async function getAlertsData(): Promise<{ success: boolean; logs: any[]; count: number; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/logs?limit=50`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return { success: false, logs: [], count: 0, error: error instanceof Error ? error.message : 'Failed to fetch alerts' };
  }
}

async function getMetricsData(): Promise<{ count: number; data: Metric[]; error?: string }> {
  try {
    // Get metrics from all hosts for system overview
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/metrics/all?limit=100`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return { count: 0, data: [], error: error instanceof Error ? error.message : 'Failed to fetch metrics' };
  }
}

// Fetch location data from API
async function getLocationsData(): Promise<{ count: number; locations: any[]; hierarchy: HierarchicalLocation[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/locations`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching locations:', error);
    return { count: 0, locations: [], hierarchy: [], error: error instanceof Error ? error.message : 'Failed to fetch locations' };
  }
}

// Fetch office data for global map
async function getOfficesData(): Promise<{ success: boolean; offices: any[]; count: number; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/offices`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching offices:', error);
    return { success: false, offices: [], count: 0, error: error instanceof Error ? error.message : 'Failed to fetch offices' };
  }
}

function getDeviceIcon(deviceId: string) {
  if (deviceId.toLowerCase().includes('router')) return <Wifi className="h-4 w-4" />;
  if (deviceId.toLowerCase().includes('switch')) return <Server className="h-4 w-4" />;
  if (deviceId.toLowerCase().includes('pc') || deviceId.toLowerCase().includes('computer')) return <Monitor className="h-4 w-4" />;
  return <Server className="h-4 w-4" />;
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

export default async function DashboardPage() {
  const [hostsData, alertsData, metricsData, locationsData, officesData] = await Promise.all([
    getHostsData(),
    getAlertsData(),
    getMetricsData(),
    getLocationsData(),
    getOfficesData(),
  ]);

  const hasConnectionError = hostsData.error || alertsData.error || metricsData.error || locationsData.error || officesData.error;
  
  // Add fallbacks for when data is undefined
  const hosts = hostsData.hosts || [];
  const logs = alertsData.logs || [];
  const metrics = metricsData.data || [];
  const locations = locationsData.locations || [];
  const hierarchy = locationsData.hierarchy || [];
  const offices = officesData.offices || [];
  
  // Process logs to get alerts
  const criticalAlerts = logs.filter(log => log.level === 'error' || log.level === 'critical').length;
  const warningAlerts = logs.filter(log => log.level === 'warn' || log.level === 'warning').length;
  const totalAlerts = logs.length;
  const operationalHosts = hosts.filter(host => host.status === 'active' || host.severity === 'info' || !host.severity).length;
  const totalInterfaces = hosts.reduce((sum, host) => sum + (host.interface_count || 0), 0);

  // Get unique metrics for system overview
  const uniqueMetrics = [...new Set(metrics.map(m => m.metric))].length;
  const recentMetrics = metrics.slice(0, 10);
  
  // Get interface-specific metrics
  const interfaceMetrics = metrics.filter(m => m.meta.ifdescr && m.meta.ifdescr !== '_global');
  const trafficMetrics = metrics.filter(m => 
    m.metric.includes('Bits received') || m.metric.includes('Bits sent')
  );
  const statusMetrics = metrics.filter(m => 
    m.metric.includes('Operational status') || m.metric.includes('Duplex status')
  );
  
  // Calculate total traffic
  const totalTrafficIn = trafficMetrics
    .filter(m => m.metric.includes('Bits received'))
    .reduce((sum, m) => sum + (typeof m.value === 'number' ? m.value : 0), 0);
  const totalTrafficOut = trafficMetrics
    .filter(m => m.metric.includes('Bits sent'))
    .reduce((sum, m) => sum + (typeof m.value === 'number' ? m.value : 0), 0);

  // Create hierarchical location items for display
  const countryItems = hierarchy.map(country => ({
    slug: country.name === 'Unknown' ? '' : country.name.toLowerCase().replace(/\s+/g, '-'),
    title: country.name,
    level: 'country' as const,
    path: country.path,
    data: [
      { name: "Healthy", value: country.healthyDevices },
      { name: "Warning", value: country.warningDevices },
      { name: "Critical", value: country.criticalDevices }
    ],
    deviceCount: country.deviceCount,
    lastSeen: country.lastSeen,
    children: country.children.map(city => ({
      slug: city.name === 'Unknown' ? country.name.toLowerCase().replace(/\s+/g, '-') : `${country.name.toLowerCase()}/${city.name.toLowerCase()}`.replace(/\s+/g, '-'),
      title: city.name,
      level: 'city' as const,
      path: city.path,
      data: [
        { name: "Healthy", value: city.healthyDevices },
        { name: "Warning", value: city.warningDevices },
        { name: "Critical", value: city.criticalDevices }
      ],
      deviceCount: city.deviceCount,
      lastSeen: city.lastSeen,
      children: city.children.map(office => ({
        slug: office.name === 'Main Office' ? `${country.name.toLowerCase()}/${city.name.toLowerCase()}`.replace(/\s+/g, '-') : `${country.name.toLowerCase()}/${city.name.toLowerCase()}/${office.name.toLowerCase()}`.replace(/\s+/g, '-'),
        title: office.name,
        level: 'office' as const,
        path: office.path,
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

  const filteredCountryItems = countryItems.length > 1 && countryItems.some(c => c.name !== 'Unknown')
    ? countryItems.filter(c => c.name !== 'Unknown')
    : countryItems;

  const displayItems = filteredCountryItems.length > 0 ? filteredCountryItems : [
    {
      slug: "",
      title: "Unknown Location",
      level: 'country' as const,
      path: "/locations", // Link to the main locations page
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

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Network Monitoring Dashboard</h1>
        <p className="text-sm text-muted-foreground">Global overview of network device health and performance.</p>
        {hasConnectionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {hostsData.error || alertsData.error || metricsData.error || locationsData.error}
            </p>
            <p className="text-red-600 text-sm mt-2">
              Make sure MongoDB is configured correctly and the monitoring agent is running.
            </p>
          </div>
        )}
      </header>

      {/* Global Health Overview Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monitored Devices</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hosts.length}</div>
            <p className="text-xs text-muted-foreground">
              {operationalHosts} operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Interfaces</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterfaces}</div>
            <p className="text-xs text-muted-foreground">Network interfaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Network Traffic</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalTrafficIn + totalTrafficOut).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalTrafficIn.toLocaleString()} in, {totalTrafficOut.toLocaleString()} out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {warningAlerts} warnings, {totalAlerts} total
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Global Office Network Map */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Global Office Network
                </CardTitle>
                <CardDescription>
                  Interactive map showing all office locations with real-time device monitoring
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Active with devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Active without devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Inactive</span>
                </div>
              </div>
          </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Map Section */}
              <div className="lg:col-span-2">
                <LeafletMap offices={offices} className="h-96" />
        </div>

              {/* Office Statistics */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Office Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total Offices</span>
                      </div>
                      <span className="font-semibold">{offices.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total Devices</span>
                      </div>
                      <span className="font-semibold">{offices.reduce((sum, office) => sum + (office.device_count || 0), 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Active Offices</span>
                      </div>
                      <span className="font-semibold">{offices.filter(o => o.status === 'active').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Inactive Offices</span>
                      </div>
                      <span className="font-semibold">{offices.filter(o => o.status !== 'active').length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Offices by Device Count */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Top Offices by Device Count</CardTitle>
                  </CardHeader>
                  <CardContent>
          <div className="space-y-2">
                      {offices
                        .sort((a, b) => (b.device_count || 0) - (a.device_count || 0))
                        .slice(0, 5)
                        .map((office, index) => (
                          <Link key={office._id} href={`/location/cities/offices/${office._id}`}>
                            <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold">
                                  {index + 1}
                                </div>
                <div>
                                  <div className="text-sm font-medium">{office.office}</div>
                                  <div className="text-xs text-muted-foreground">{office.city}, {office.country}</div>
                                </div>
                </div>
                <div className="text-right">
                                <div className="text-sm font-semibold">{office.device_count || 0}</div>
                                <div className="text-xs text-muted-foreground">devices</div>
                </div>
              </div>
                          </Link>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/location">
                      <Button variant="outline" className="w-full justify-start">
                        <MapPin className="h-4 w-4 mr-2" />
                        View All Locations
                      </Button>
                    </Link>
                    <Link href="/location?view=map">
                      <Button variant="outline" className="w-full justify-start">
                        <Map className="h-4 w-4 mr-2" />
                        Switch to Map View
                      </Button>
                    </Link>
                    <Link href="/devices">
                      <Button variant="outline" className="w-full justify-start">
                        <Server className="h-4 w-4 mr-2" />
                        View All Devices
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
          </div>
        </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent Alerts and Activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Recent Critical Alerts
            </CardTitle>
            <CardDescription>
              Latest critical alerts requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.filter(log => log.level === 'error' || log.level === 'critical').slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {logs.filter(log => log.level === 'error' || log.level === 'critical').slice(0, 5).map((log, index) => (
                  <div key={log._id || index} className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="text-sm font-medium">{log.deviceName || 'Unknown Device'}</div>
                        <div className="text-xs text-muted-foreground">{log.message || 'Critical Alert'}</div>
                      </div>
                    </div>
                    <Badge variant="destructive">Critical</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No critical alerts</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Device Health Overview
            </CardTitle>
            <CardDescription>
              Current status of all monitored devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Operational</span>
                </div>
                <span className="font-semibold">{operationalHosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Warning</span>
                </div>
                <span className="font-semibold">{warningAlerts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Critical</span>
                </div>
                <span className="font-semibold">{criticalAlerts}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Devices</span>
                  <span className="font-semibold">{hosts.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
