import { BackButton } from '@/components/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Wifi, Server, Monitor, Activity, Settings, Network, HardDrive, Cpu, Memory, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogPanel } from '@/components/log-panel'; // Assuming LogPanel can filter by device_id

interface DeviceDetails {
  hostid: string;
  device_id: string;
  last_seen: Date;
  total_interfaces: number;
  interfaces: {
    iface: string;
    ifdescr: string;
    status: 'up' | 'down' | 'unknown';
    last_seen: Date;
    metrics: any[]; // Raw metrics for the interface
    troubleshooting: {
      issues: string[];
      suggestions: string[];
    };
  }[];
  alerts: any[];
  metrics_summary: any[]; // Summary metrics like CPU, Memory, Disk
}

// Fetch device data from API
async function getDeviceData(hostid: string): Promise<DeviceDetails & { error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/devices/${hostid}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error(`Error fetching device ${hostid} details:`, error);
    return { 
      hostid, device_id: 'Unknown', last_seen: new Date(0), 
      total_interfaces: 0, interfaces: [], alerts: [], metrics_summary: [],
      error: error instanceof Error ? error.message : 'Failed to fetch device details' 
    };
  }
}

function getStatusBadge(status: string, severity: string) {
  if (severity === 'critical' || status === 'down') {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
  }
  if (severity === 'warning') {
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Warning</Badge>;
  }
  return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Operational</Badge>;
}

function getInterfaceStatusBadge(status: 'up' | 'down' | 'unknown') {
  if (status === 'up') {
    return <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3" />Up</Badge>;
  }
  if (status === 'down') {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Down</Badge>;
  }
  return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Unknown</Badge>;
}

export default async function DeviceDetailsPage({ params }: { params: { hostid: string } }) {
  const { hostid } = params;
  const deviceData = await getDeviceData(hostid);

  const hasConnectionError = deviceData.error;

  if (hasConnectionError) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <header className="mb-6">
          <BackButton />
          <h1 className="text-2xl font-semibold text-balance mt-4">Device Details</h1>
          <p className="text-sm text-muted-foreground">Host ID: {hostid}</p>
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {deviceData.error}
            </p>
            <p className="text-red-600 text-sm mt-2">
              Make sure MongoDB is configured correctly and the monitoring agent is running.
            </p>
          </div>
        </header>
      </main>
    );
  }

  const { device_id, last_seen, total_interfaces, interfaces, alerts, metrics_summary } = deviceData;

  const cpuMetric = metrics_summary.find(m => m.metric.toLowerCase().includes('cpu'));
  const memoryMetric = metrics_summary.find(m => m.metric.toLowerCase().includes('memory'));
  const diskMetric = metrics_summary.find(m => m.metric.toLowerCase().includes('disk'));

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <BackButton />
        <h1 className="text-2xl font-semibold text-balance mt-4">{device_id} Details</h1>
        <p className="text-sm text-muted-foreground">Host ID: {hostid} • Last seen: {new Date(last_seen).toLocaleString()}</p>
      </header>

      {/* Device Overview Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interfaces</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_interfaces}</div>
            <p className="text-xs text-muted-foreground">Monitored interfaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {interfaces.filter(i => i.status === 'up').length} Up
            </div>
            <p className="text-xs text-muted-foreground">
              {interfaces.filter(i => i.status === 'down').length} Down, {interfaces.filter(i => i.status === 'unknown').length} Unknown
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">Total recent alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Utilization</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cpuMetric ? `${cpuMetric.value}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Latest CPU usage</p>
          </CardContent>
        </Card>
      </section>

      {/* Interface Details */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Interface Overview</CardTitle>
            <CardDescription>Detailed status and troubleshooting for each network interface.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {interfaces.length > 0 ? (interfaces.map(iface => (
                  <div key={iface.iface} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Network className="h-4 w-4 text-blue-500" />
                        <p className="font-medium text-base">{iface.ifdescr} ({iface.iface})</p>
                        {getInterfaceStatusBadge(iface.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">Last seen: {new Date(iface.last_seen).toLocaleString()}</p>
                      {iface.troubleshooting.issues.length > 0 && (
                        <div className="mt-2 text-sm text-red-600 font-medium">
                          Issues:
                          <ul className="list-disc list-inside ml-4">
                            {iface.troubleshooting.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                          </ul>
                        </div>
                      )}
                      {iface.troubleshooting.suggestions.length > 0 && (
                        <div className="mt-2 text-sm text-amber-600">
                          Suggestions:
                          <ul className="list-disc list-inside ml-4">
                            {iface.troubleshooting.suggestions.map((suggestion, idx) => <li key={idx}>{suggestion}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-4 text-right">
                      <h4 className="text-sm font-semibold mb-2">Recent Metrics</h4>
                      <div className="space-y-1">
                        {iface.metrics.map(metric => (
                          <p key={metric._id} className="text-xs text-muted-foreground">
                            {metric.metric}: {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                          </p>
                        ))}
                        {iface.metrics.length === 0 && (
                          <p className="text-xs text-muted-foreground">No recent metrics</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No interfaces found for this device.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      {/* Metrics Summary */}
      <section className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics Summary</CardTitle>
            <CardDescription>Important performance indicators for this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics_summary.length > 0 ? (metrics_summary.map(metric => (
                <div key={metric._id} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.metric}</span>
                  <span className="text-sm text-muted-foreground">
                    {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                  </span>
                </div>
              ))) : (
                <div className="text-muted-foreground text-center py-4">No key metrics available.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Device-specific Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Device Alerts</CardTitle>
            <CardDescription>Latest alerts specific to this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {alerts.length > 0 ? (alerts.map(alert => (
                  <div key={alert._id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{alert.metric}</p>
                      <p className="text-xs text-muted-foreground">Interface: {alert.iface}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(alert.status, alert.severity)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.detected_at * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))) : (
                  <p className="text-muted-foreground text-center py-4">No recent alerts for this device.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      {/* Device-specific Logs */}
      <section className="mb-6">
        <LogPanel deviceFilter={device_id} />
      </section>
    </main>
  );
}
