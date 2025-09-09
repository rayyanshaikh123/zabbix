import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Server, Wifi, Monitor } from "lucide-react";
import { BackButton } from "@/components/back-button";

interface Host {
  hostid: string;
  device_id: string;
  last_seen?: Date;
  interface_count?: number;
  status?: string;
  severity?: string;
}

async function getHostsData(): Promise<{ count: number; hosts: Host[]; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hosts/all`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return { count: 0, hosts: [], error: error instanceof Error ? error.message : 'Failed to fetch hosts' };
  }
}

function getDeviceIcon(deviceId: string) {
  if (deviceId.toLowerCase().includes('router') || deviceId.toLowerCase().includes('r1')) return <Wifi className="h-4 w-4" />;
  if (deviceId.toLowerCase().includes('switch') || deviceId.toLowerCase().includes('s1')) return <Server className="h-4 w-4" />;
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

export default async function DevicesPage() {
  const hostsData = await getHostsData();
  const hasConnectionError = hostsData.error;
  const hosts = hostsData.hosts || [];

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 glass-panel p-4" style={{ ['--glass-radius' as any]: '0' }}>
      
        <h1 className="text-2xl font-semibold text-balance">All Devices</h1>
         
        <p className="text-sm text-muted-foreground">Overview of all monitored network devices.</p>
        {hasConnectionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {hostsData.error}
            </p>
            <p className="text-red-600 text-sm mt-2">
              Make sure MongoDB is configured correctly and the monitoring agent is running.
            </p>
          </div>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hosts.length > 0 ? (hosts.map(host => (
          <Link key={host.hostid} href={`/devices/${host.hostid}`} className="block">
            <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getDeviceIcon(host.device_id)}
                  {host.device_id}
                </CardTitle>
                {getStatusBadge(host.status || 'Operational', host.severity || 'info')}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Host ID: {host.hostid}</p>
                {host.interface_count !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">Interfaces: {host.interface_count}</p>
                )}
                {host.last_seen && (
                  <p className="text-xs text-muted-foreground mt-1">Last seen: {new Date(host.last_seen).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))) : (
          <div className="col-span-full text-center py-12">
            <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
            <p className="text-muted-foreground mb-4">
              No devices were found in the monitoring system.
            </p>
            <p className="text-sm text-muted-foreground">
              Make sure your monitoring agent is running and collecting data.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
