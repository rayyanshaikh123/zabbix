import { MetricCard } from "@/components/metric-cards"
import { LogPanel } from "@/components/log-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, Activity, Server, Wifi, Monitor, TrendingUp } from "lucide-react"
import Link from "next/link"
import { HealthChart } from "@/components/charts/health-chart"
import { LocationMapWrapper } from "@/components/map/location-map-wrapper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Map, MapPin } from "lucide-react"

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

async function getHostsData(): Promise<{ count: number; hosts: Host[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hosts`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return { count: 0, hosts: [], error: error instanceof Error ? error.message : 'Failed to fetch hosts' };
  }
}

async function getAlertsData(): Promise<{ count: number; alerts: Alert[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/alerts?limit=20`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return { count: 0, alerts: [], error: error instanceof Error ? error.message : 'Failed to fetch alerts' };
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
  const [hostsData, alertsData, metricsData, locationsData] = await Promise.all([
    getHostsData(),
    getAlertsData(),
    getMetricsData(),
    getLocationsData(),
  ]);

  const hasConnectionError = hostsData.error || alertsData.error || metricsData.error || locationsData.error;
  
  // Add fallbacks for when data is undefined
  const hosts = hostsData.hosts || [];
  const alerts = alertsData.alerts || [];
  const metrics = metricsData.data || [];
  const locations = locationsData.locations || [];
  const hierarchy = locationsData.hierarchy || [];
  
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning').length;
  const totalAlerts = alerts.length;
  const operationalHosts = hosts.filter(host => host.severity === 'info' || !host.severity).length;
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
    </main>
  );
}
