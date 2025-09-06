import { MetricCard } from "@/components/metric-cards"
import { LogPanel } from "@/components/log-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, Activity, Server, Wifi, Monitor, TrendingUp } from "lucide-react"

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

async function getHostsData(): Promise<{ count: number; hosts: Host[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hosts`, {
      cache: 'no-store',
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
      cache: 'no-store',
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
      cache: 'no-store',
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return { count: 0, data: [], error: error instanceof Error ? error.message : 'Failed to fetch metrics' };
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
  const [hostsData, alertsData, metricsData] = await Promise.all([
    getHostsData(),
    getAlertsData(),
    getMetricsData()
  ]);

  const hasConnectionError = hostsData.error || alertsData.error || metricsData.error;
  
  // Add fallbacks for when data is undefined
  const hosts = hostsData.hosts || [];
  const alerts = alertsData.alerts || [];
  const metrics = metricsData.data || [];
  
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning').length;
  const totalAlerts = alerts.length;
  const operationalHosts = hosts.filter(host => host.severity === 'info' || !host.severity).length;
  const totalInterfaces = hosts.reduce((sum, host) => sum + (host.interface_count || 0), 0);

  // Get unique metrics for system overview
  const uniqueMetrics = [...new Set(metrics.map(m => m.metric))].length;
  const recentMetrics = metrics.slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Network Monitoring Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time network device monitoring, system metrics, and agent logs.</p>
        {hasConnectionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {hostsData.error || alertsData.error || metricsData.error}
            </p>
            <p className="text-red-600 text-sm mt-2">
              Make sure MongoDB is configured correctly and the monitoring agent is running.
            </p>
          </div>
        )}
      </header>

      {/* System Overview Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitored Hosts</CardTitle>
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
            <CardTitle className="text-sm font-medium">Active Interfaces</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterfaces}</div>
            <p className="text-xs text-muted-foreground">Network interfaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Metrics</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueMetrics}</div>
            <p className="text-xs text-muted-foreground">Unique metrics tracked</p>
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
      </section>

      {/* System Monitoring and Agent Logs */}
      <section className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>System Monitoring</CardTitle>
            <CardDescription>Recent metrics from all monitored devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMetrics.map((metric) => (
                <div key={metric._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(metric.meta.device_id)}
                    <div>
                      <p className="font-medium text-sm">{metric.meta.device_id}</p>
                      <p className="text-xs text-muted-foreground">{metric.metric}</p>
                      {metric.meta.ifdescr && (
                        <p className="text-xs text-muted-foreground">Interface: {metric.meta.ifdescr}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.value_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(metric.ts * 1000).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentMetrics.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No metrics available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Logs & Alerts</CardTitle>
            <CardDescription>Latest alerts and notifications from monitoring agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(alert.device_id)}
                    <div>
                      <p className="font-medium text-sm">{alert.device_id}</p>
                      <p className="text-xs text-muted-foreground">{alert.metric}</p>
                      <p className="text-xs text-muted-foreground">Interface: {alert.iface}</p>
                    </div>
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
                <p className="text-muted-foreground text-center py-8">No alerts available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Device Status Overview */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device Status Overview</CardTitle>
            <CardDescription>Current status of all monitored devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hosts.slice(0, 8).map((host) => (
                <div key={host.hostid} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(host.device_id)}
                    <div>
                      <p className="font-medium">{host.device_id}</p>
                      <p className="text-sm text-muted-foreground">ID: {host.hostid}</p>
                      {host.interface_count && (
                        <p className="text-xs text-muted-foreground">{host.interface_count} interfaces</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(host.status || 'Operational', host.severity || 'info')}
                    {host.last_seen && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last seen: {new Date(host.last_seen).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {hosts.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No devices found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health Summary</CardTitle>
            <CardDescription>Overall system health and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">System Uptime</span>
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Data Collection</span>
                <Badge variant="default" className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Alert System</span>
                <Badge variant={criticalAlerts > 0 ? "destructive" : "default"} className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalAlerts > 0 ? `${criticalAlerts} Critical` : 'Normal'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monitoring Coverage</span>
                <span className="text-sm text-muted-foreground">
                  {hosts.length} devices, {totalInterfaces} interfaces
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <LogPanel />
      </section>
    </main>
  )
}
