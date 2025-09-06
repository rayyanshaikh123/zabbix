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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/hosts`, {
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/alerts?limit=10`, {
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
          title="Network Devices"
          value={hostsData.count}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: hostsData.count }))}
        />
        <MetricCard
          title="Active Interfaces"
          value={hostsData.hosts.reduce((sum, host) => sum + (host.interface_count || 0), 0)}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: Math.round(50 + Math.sin(i) * 10) }))}
        />
        <MetricCard
          title="Interface Issues"
          value={alertsData.alerts.filter(alert => alert.severity === 'critical' && alert.status.includes('Operational')).length}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: criticalAlerts }))}
        />
        <MetricCard
          title="Bandwidth Alerts"
          value={alertsData.alerts.filter(alert => alert.status.includes('High bandwidth')).length}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: totalAlerts }))}
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Network Device Health</h3>
          <div className="space-y-3">
            {hostsData.hosts.slice(0, 5).map((host) => (
              <div key={host.hostid} className="flex justify-between items-center p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    host.interface_count && host.interface_count > 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="font-medium">{host.device_id}</p>
                    <p className="text-sm text-muted-foreground">Cisco Router</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{host.interface_count || 0} interfaces</p>
                  <p className="text-xs text-muted-foreground">
                    {host.last_seen ? new Date(host.last_seen).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            ))}
            {hostsData.hosts.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">No network devices detected</p>
                <p className="text-xs text-muted-foreground mt-1">Start the Zabbix agent to begin monitoring</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Interface Status & Alerts</h3>
          <div className="space-y-3">
            {alertsData.alerts.slice(0, 5).map((alert) => (
              <div key={alert._id} className="flex justify-between items-center p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-500' :
                    alert.severity === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="font-medium">{alert.device_id}</p>
                    <p className="text-sm text-muted-foreground">{alert.metric}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
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
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">No alerts detected</p>
                <p className="text-xs text-muted-foreground mt-1">All systems operating normally</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Interface Monitoring</h3>
          <div className="space-y-4">
            {hostsData.hosts.length > 0 ? (
              <div className="space-y-3">
                {hostsData.hosts.map((host) => (
                  <div key={host.hostid} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">{host.device_id}</h4>
                      <span className="text-sm text-muted-foreground">Cisco 1841</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Fa0/0</span>
                          <span className="text-sm text-red-600">DOWN</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Fa0/1</span>
                          <span className="text-sm text-green-600">UP</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">CPU Usage</span>
                          <span className="text-sm">0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Memory</span>
                          <span className="text-sm">8.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <p className="text-muted-foreground">No interface data available</p>
                <p className="text-xs text-muted-foreground mt-1">Configure agent with BACKEND_URL to see interface status</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Backend Status</span>
              <span className="text-sm text-green-600">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Database</span>
              <span className="text-sm text-green-600">MongoDB Atlas</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Agent Status</span>
              <span className="text-sm text-yellow-600">Running</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Data Flow</span>
              <span className="text-sm text-red-600">No Data</span>
            </div>
          </div>
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Configuration Required</h4>
            <p className="text-xs text-yellow-700">
              Set BACKEND_URL environment variable in agent to enable data flow:
            </p>
            <code className="text-xs bg-yellow-100 px-2 py-1 rounded mt-2 block">
              $env:BACKEND_URL="http://localhost:8000"
            </code>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <LogPanel />
      </section>
    </main>
  )
}
