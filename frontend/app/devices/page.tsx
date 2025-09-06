import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, Wifi, Server, Monitor } from "lucide-react"

interface Device {
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

async function getDevicesData(): Promise<{ count: number; devices: Device[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hosts`, {
      cache: 'no-store',
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching devices:', error);
    return { count: 0, devices: [], error: error instanceof Error ? error.message : 'Failed to fetch devices' };
  }
}

async function getAlertsData(): Promise<{ count: number; alerts: Alert[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/alerts?limit=50`, {
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

function getDeviceIcon(deviceId: string) {
  if (deviceId.toLowerCase().includes('router')) return <Wifi className="h-5 w-5" />;
  if (deviceId.toLowerCase().includes('switch')) return <Server className="h-5 w-5" />;
  if (deviceId.toLowerCase().includes('pc') || deviceId.toLowerCase().includes('computer')) return <Monitor className="h-5 w-5" />;
  return <Server className="h-5 w-5" />;
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

export default async function DevicesPage() {
  const [devicesData, alertsData] = await Promise.all([
    getDevicesData(),
    getAlertsData()
  ]);

  const hasConnectionError = devicesData.error || alertsData.error;
  
  // Add fallbacks for when data is undefined
  const devices = devicesData.devices || [];
  const alerts = alertsData.alerts || [];
  
  const criticalDevices = devices.filter(device => device.severity === 'critical').length;
  const warningDevices = devices.filter(device => device.severity === 'warning').length;
  const operationalDevices = devices.filter(device => device.severity === 'info' || !device.severity).length;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Network Devices</h1>
        <p className="text-sm text-muted-foreground">Monitor switches, routers, PCs and interfaces with health metrics.</p>
        {hasConnectionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {devicesData.error || alertsData.error}
            </p>
          </div>
        )}
      </header>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">Monitored devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{operationalDevices}</div>
            <p className="text-xs text-muted-foreground">Healthy devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningDevices}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalDevices}</div>
            <p className="text-xs text-muted-foreground">Requires immediate action</p>
          </CardContent>
        </Card>
      </section>

      {/* Devices List */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connected Devices</CardTitle>
            <CardDescription>All monitored network devices and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.hostid} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(device.device_id)}
                    <div>
                      <p className="font-medium">{device.device_id}</p>
                      <p className="text-sm text-muted-foreground">ID: {device.hostid}</p>
                      {device.interface_count && (
                        <p className="text-xs text-muted-foreground">{device.interface_count} interfaces</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(device.status || 'Operational', device.severity || 'info')}
                    {device.last_seen && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last seen: {new Date(device.last_seen).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {devices.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No devices found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest alerts and notifications from monitored devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(alert.device_id)}
                    <div>
                      <p className="font-medium">{alert.device_id}</p>
                      <p className="text-sm text-muted-foreground">{alert.metric}</p>
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
                <p className="text-muted-foreground text-center py-8">No alerts found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
