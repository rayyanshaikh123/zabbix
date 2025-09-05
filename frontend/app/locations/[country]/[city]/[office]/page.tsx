import { HealthChart } from "@/components/charts/health-chart"
import { MetricCard } from "@/components/metric-cards"
import { LocationSelector } from "@/components/location-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/back-button"

const deviceHealth = {
  switches: { Healthy: 70, Warning: 20, Critical: 10, count: 24 },
  routers: { Healthy: 78, Warning: 12, Critical: 10, count: 8 },
  pcs: { Healthy: 64, Warning: 26, Critical: 10, count: 180 },
  interfaces: { Healthy: 82, Warning: 11, Critical: 7, count: 420 },
}

export default function OfficeDevicesPage({
  params,
}: {
  params: { country: string; city: string; office: string }
}) {
  const { country, city, office } = params
  const titleOffice = office.replace("-", " ")

  const totals = Object.values(deviceHealth).reduce(
    (acc, v) => {
      acc.count += v.count
      acc.healthyWeighted += v.Healthy * v.count
      acc.warningWeighted += v.Warning * v.count
      acc.criticalWeighted += v.Critical * v.count
      return acc
    },
    { count: 0, healthyWeighted: 0, warningWeighted: 0, criticalWeighted: 0 },
  )
  const healthyPct = totals.count ? Math.round(totals.healthyWeighted / totals.count) : 0
  const warningPct = totals.count ? Math.round(totals.warningWeighted / totals.count) : 0
  const criticalPct = totals.count ? Math.round(totals.criticalWeighted / totals.count) : 0

  const healthSeries = Array.from({ length: 8 }).map((_, i) => ({
    x: i + 1,
    y: Math.max(0, Math.min(100, healthyPct + (i % 3 === 0 ? -2 : 1))),
  }))
  const warnSeries = Array.from({ length: 8 }).map((_, i) => ({
    x: i + 1,
    y: Math.max(0, Math.min(100, warningPct + (i % 4 === 0 ? 2 : -1))),
  }))
  const critSeries = Array.from({ length: 8 }).map((_, i) => ({
    x: i + 1,
    y: Math.max(0, Math.min(100, criticalPct + (i % 5 === 0 ? 2 : -1))),
  }))

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">{titleOffice} — Devices Health</h1>
        <LocationSelector initial={{ country, city, office }} />
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Health Score" value={`${healthyPct}%`} data={healthSeries} />
        <MetricCard title="Healthy %" value={`${healthyPct}%`} data={healthSeries} />
        <MetricCard title="Warning %" value={`${warningPct}%`} data={warnSeries} />
        <MetricCard title="Critical %" value={`${criticalPct}%`} data={critSeries} />
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Devices" value={24 + 8 + 180 + 420} delta="+2 today" />
        <MetricCard title="Incidents (24h)" value={12} delta="-3 vs yesterday" />
        <MetricCard title="Uptime" value="99.1%" />
        <MetricCard title="Agent Errors" value={5} />
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <HealthChart
          title={`Switches (${deviceHealth.switches.count})`}
          data={[
            { name: "Healthy", value: deviceHealth.switches.Healthy },
            { name: "Warning", value: deviceHealth.switches.Warning },
            { name: "Critical", value: deviceHealth.switches.Critical },
          ]}
        />
        <HealthChart
          title={`Routers (${deviceHealth.routers.count})`}
          data={[
            { name: "Healthy", value: deviceHealth.routers.Healthy },
            { name: "Warning", value: deviceHealth.routers.Warning },
            { name: "Critical", value: deviceHealth.routers.Critical },
          ]}
        />
        <HealthChart
          title={`PCs (${deviceHealth.pcs.count})`}
          data={[
            { name: "Healthy", value: deviceHealth.pcs.Healthy },
            { name: "Warning", value: deviceHealth.pcs.Warning },
            { name: "Critical", value: deviceHealth.pcs.Critical },
          ]}
        />
        <HealthChart
          title={`Interfaces (${deviceHealth.interfaces.count})`}
          data={[
            { name: "Healthy", value: deviceHealth.interfaces.Healthy },
            { name: "Warning", value: deviceHealth.interfaces.Warning },
            { name: "Critical", value: deviceHealth.interfaces.Critical },
          ]}
        />
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Interfaces — Health Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Interface</th>
                    <th className="px-3 py-2 text-left font-medium">Device</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Errors</th>
                    <th className="px-3 py-2 text-left font-medium">Last Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">Gi0/{i + 1}</td>
                      <td className="px-3 py-2">switch-{Math.ceil((i + 1) / 2)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={[
                            "inline-flex items-center rounded px-2 py-0.5 text-xs",
                            i % 5 === 0
                              ? "bg-rose-100 text-rose-700"
                              : i % 3 === 0
                                ? "bg-sky-100 text-sky-700"
                                : "bg-green-100 text-green-700",
                          ].join(" ")}
                        >
                          {i % 5 === 0 ? "Critical" : i % 3 === 0 ? "Warning" : "Healthy"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{i % 5 === 0 ? 7 : i % 3 === 0 ? 2 : 0}</td>
                      <td className="px-3 py-2">{new Date().toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
