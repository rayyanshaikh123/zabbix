import { MetricCard } from "@/components/metric-cards"
import { LogPanel } from "@/components/logs/log-panel"

interface Host {
  hostid: string;
  device_id: string;
  last_seen: Date;
  interface_count: number;
}

interface Alert {
  _id: string;
  device_id: string;
  hostid?: string;
  status: string;
  severity: string;
  detected_at: number;
}

async function getHostsData(): Promise<{ count: number; hosts: Host[]; error?: string }> {
  try {
    const res = await fetch(`/api/hosts`, {
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
    const res = await fetch(`/api/alerts?limit=10`, {
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

export default async function DashboardPage() {
  const [hostsData, alertsData] = await Promise.all([
    getHostsData(),
    getAlertsData()
  ]);

  const hasConnectionError = hostsData.error || alertsData.error;
  const criticalAlerts = alertsData.alerts.filter(alert => alert.severity === 'critical').length;
  const totalAlerts = alertsData.alerts.length;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Network Monitoring Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time network device monitoring and alerts.</p>
        {hasConnectionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {hostsData.error || alertsData.error}
            </p>
            <p className="text-red-600 text-sm mt-2">
              Make sure MongoDB Atlas is configured correctly. Check the setup guide in MONGODB_ATLAS_SETUP.md
            </p>
          </div>
        )}
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monitored Hosts"
          value={hostsData.count}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: hostsData.count }))}
        />
        <MetricCard
          title="Active Interfaces"
          value={hostsData.hosts.reduce((sum, host) => sum + host.interface_count, 0)}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: Math.round(50 + Math.sin(i) * 10) }))}
        />
        <MetricCard
          title="Critical Alerts"
          value={criticalAlerts}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: criticalAlerts }))}
        />
        <MetricCard
          title="Total Alerts"
          value={totalAlerts}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: totalAlerts }))}
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Hosts</h3>
          <div className="space-y-2">
            {hostsData.hosts.slice(0, 5).map((host) => (
              <div key={host.hostid} className="flex justify-between items-center p-2 rounded bg-muted/50">
                <div>
                  <p className="font-medium">{host.device_id}</p>
                  <p className="text-sm text-muted-foreground">ID: {host.hostid}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{host.interface_count} interfaces</p>
                  <p className="text-xs text-muted-foreground">
                    Last seen: {new Date(host.last_seen).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {hostsData.hosts.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No hosts data available</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-2">
            {alertsData.alerts.slice(0, 5).map((alert) => (
              <div key={alert._id} className="flex justify-between items-center p-2 rounded bg-muted/50">
                <div>
                  <p className="font-medium">{alert.device_id}</p>
                  <p className="text-sm text-muted-foreground">{alert.status}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {alert.severity}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.detected_at * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {alertsData.alerts.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No alerts available</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <LogPanel />
      </section>
    </main>
  )
}
