import { getCollection } from "@/lib/mongo"
import { MetricCard } from "@/components/metric-cards"
import { BackButton } from "@/components/back-button"

interface Device {
  device_id: string
  hostid: string
  interfaces: Interface[]
  last_seen: Date
  cpu_usage: number
  memory_usage: number
}

interface Interface {
  name: string
  status: 'up' | 'down'
  speed: number
  in_octets: number
  out_octets: number
  errors: number
}

async function getDevicesData(): Promise<{ devices: Device[]; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/hosts`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error(`HTTP ${res.status}: ${errorText}`)
      throw new Error(`HTTP ${res.status}: ${errorText}`)
    }
    const data = await res.json()
    console.log('Devices API response:', data)
    return data
  } catch (error) {
    console.error('Error fetching devices:', error)
    return { devices: [], error: error instanceof Error ? error.message : 'Failed to fetch devices' }
  }
}

async function getInterfaceData(): Promise<{ interfaces: Interface[]; error?: string }> {
  try {
    const metricsCollection = await getCollection('metrics_ts')
    
    // Get interface data from metrics
    const interfaceMetrics = await metricsCollection.aggregate([
      {
        $match: {
          'meta.ifdescr': { $exists: true, $ne: null },
          'metric': { $in: ['ifOperStatus', 'ifSpeed', 'ifInOctets', 'ifOutOctets'] }
        }
      },
      {
        $group: {
          _id: {
            device_id: '$meta.device_id',
            ifdescr: '$meta.ifdescr'
          },
          metrics: {
            $push: {
              metric: '$metric',
              value: '$value',
              ts: '$ts'
            }
          },
          last_seen: { $max: '$ts' }
        }
      },
      {
        $project: {
          _id: 0,
          device_id: '$_id.device_id',
          interface: '$_id.ifdescr',
          last_seen: 1,
          oper_status: {
            $arrayElemAt: [
              {
                $map: {
                  input: { $filter: { input: '$metrics', cond: { $eq: ['$$this.metric', 'ifOperStatus'] } } },
                  as: 'm',
                  in: '$$m.value'
                }
              },
              0
            ]
          },
          speed: {
            $arrayElemAt: [
              {
                $map: {
                  input: { $filter: { input: '$metrics', cond: { $eq: ['$$this.metric', 'ifSpeed'] } } },
                  as: 'm',
                  in: '$$m.value'
                }
              },
              0
            ]
          },
          in_octets: {
            $arrayElemAt: [
              {
                $map: {
                  input: { $filter: { input: '$metrics', cond: { $eq: ['$$this.metric', 'ifInOctets'] } } },
                  as: 'm',
                  in: '$$m.value'
                }
              },
              0
            ]
          },
          out_octets: {
            $arrayElemAt: [
              {
                $map: {
                  input: { $filter: { input: '$metrics', cond: { $eq: ['$$this.metric', 'ifOutOctets'] } } },
                  as: 'm',
                  in: '$$m.value'
                }
              },
              0
            ]
          }
        }
      }
    ]).toArray()

    const interfaces: Interface[] = interfaceMetrics.map(item => ({
      name: item.interface,
      status: item.oper_status === 1 ? 'up' : 'down',
      speed: item.speed || 0,
      in_octets: item.in_octets || 0,
      out_octets: item.out_octets || 0,
      errors: 0 // Would need error metrics
    }))

    console.log('Interface data:', { interfaceMetrics, interfaces })
    return { interfaces }
  } catch (error) {
    console.error('Error fetching interface data:', error)
    return { interfaces: [], error: error instanceof Error ? error.message : 'Failed to fetch interface data' }
  }
}

export default async function DevicesPage() {
  const [devicesData, interfaceData] = await Promise.all([
    getDevicesData(),
    getInterfaceData()
  ])

  const totalInterfaces = interfaceData.interfaces?.length || 0
  const upInterfaces = interfaceData.interfaces?.filter(i => i.status === 'up').length || 0
  const downInterfaces = interfaceData.interfaces?.filter(i => i.status === 'down').length || 0
  const totalDevices = devicesData.devices?.length || 0

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-balance">Network Devices & Interfaces</h1>
        <p className="text-sm text-muted-foreground">Monitor all network devices, interfaces, and their operational status.</p>
        
        {/* Error Display */}
        {(devicesData.error || interfaceData.error) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Data Loading Issues</h3>
            {devicesData.error && (
              <p className="text-red-600 text-sm mt-1">Devices: {devicesData.error}</p>
            )}
            {interfaceData.error && (
              <p className="text-red-600 text-sm mt-1">Interfaces: {interfaceData.error}</p>
            )}
            <p className="text-red-600 text-sm mt-2">
              Make sure the backend is running and agent is configured with BACKEND_URL.
            </p>
          </div>
        )}
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Devices"
          value={totalDevices}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: totalDevices }))}
        />
        <MetricCard
          title="Total Interfaces"
          value={totalInterfaces}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: totalInterfaces }))}
        />
        <MetricCard
          title="Interfaces UP"
          value={upInterfaces}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: upInterfaces }))}
        />
        <MetricCard
          title="Interfaces DOWN"
          value={downInterfaces}
          data={Array.from({ length: 12 }).map((_, i) => ({ x: i + 1, y: downInterfaces }))}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Device Overview</h3>
          <div className="space-y-3">
            {devicesData.devices && devicesData.devices.length > 0 ? (
              devicesData.devices.map((device) => (
                <div key={device.hostid} className="flex justify-between items-center p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <p className="font-medium">{device.device_id}</p>
                      <p className="text-sm text-muted-foreground">Cisco Router</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{device.interfaces?.length || 0} interfaces</p>
                    <p className="text-xs text-muted-foreground">
                      {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">No devices detected</p>
                <p className="text-xs text-muted-foreground mt-1">Start the Zabbix agent to begin monitoring</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Interface Status</h3>
          <div className="space-y-3">
            {interfaceData.interfaces && interfaceData.interfaces.length > 0 ? (
              interfaceData.interfaces.map((iface, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      iface.status === 'up' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">{iface.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {iface.speed > 0 ? `${(iface.speed / 1000000).toFixed(0)} Mbps` : 'Unknown speed'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      iface.status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {iface.status.toUpperCase()}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {iface.errors} errors
                    </p>
                  </div>
                </div>
              ))
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
      </section>
    </main>
  )
}
