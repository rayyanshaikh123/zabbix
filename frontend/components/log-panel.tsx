"use client"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AITroubleshootModal } from "@/components/ai-troubleshoot-modal"
import { Bot, Lightbulb } from "lucide-react"

type Log = {
  id: string
  time: string // ISO
  level: "info" | "warn" | "error"
  message: string
  suggestion?: string
  device?: string
  interface?: string
  metric?: string
  value?: any
}

type LogsResponse = {
  success: boolean
  logs: Log[]
  stats: {
    total: number
    critical: number
    warning: number
    info: number
    devices: number
  }
  count: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LogPanel({ deviceFilter }: { deviceFilter?: string }) {
  const { data } = useSWR<LogsResponse>(`/api/logs${deviceFilter ? `?device=${deviceFilter}` : ''}`, fetcher, {
    fallbackData: {
      success: true,
      logs: [
        { id: "1", time: new Date().toISOString(), level: "info", message: "Agent started" },
        {
          id: "2",
          time: new Date().toISOString(),
          level: "warn",
          message: "High CPU on router-3",
          suggestion: "Consider restarting interfaces Gi0/2 & Gi0/3",
        },
        {
          id: "3",
          time: new Date().toISOString(),
          level: "error",
          message: "Switch-7 unreachable",
          suggestion: "Ping test failed. Check uplink.",
        },
      ],
      stats: { total: 3, critical: 1, warning: 1, info: 1, devices: 2 },
      count: 3
    },
  })

  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error">("all")
  const [selectedDevice, setSelectedDevice] = useState<string>(deviceFilter || "all")
  
  const filtered = useMemo(
    () => {
      const logs = data?.logs || []
      let filteredLogs = filter === "all" ? logs : logs.filter((l) => l.level === filter)
      
      const currentDeviceFilter = deviceFilter || selectedDevice
      if (currentDeviceFilter !== "all") {
        filteredLogs = filteredLogs.filter((l) => l.device === currentDeviceFilter)
      }
      
      return filteredLogs
    },
    [data, filter, selectedDevice, deviceFilter],
  )

  // Get unique devices for filter
  const uniqueDevices = useMemo(() => {
    const devices = [...new Set(data?.logs?.map(log => log.device).filter(Boolean) || [])]
    return devices
  }, [data?.logs])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-balance">Agent Logs & Troubleshooting</CardTitle>
          {data?.stats && (
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Total: {data.stats.total}</span>
              <span className="text-red-600">Errors: {data.stats.critical}</span>
              <span className="text-yellow-600">Warnings: {data.stats.warning}</span>
              <span className="text-blue-600">Info: {data.stats.info}</span>
              <span>Devices: {data.stats.devices}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex gap-2">
            {(["all", "info", "warn", "error"] as const).map((k) => (
              <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </Button>
            ))}
          </div>
          {uniqueDevices.length > 1 && !deviceFilter && (
            <div className="flex gap-2">
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md bg-background"
              >
                <option value="all">All Devices</option>
                {uniqueDevices.map((device) => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] overflow-auto rounded-md border">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">No logs available</p>
                <p className="text-xs mt-1">Start the monitoring agent to see logs</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((l) => (
                <li key={l.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-muted-foreground">
                          {new Date(l.time).toLocaleString()}
                        </div>
                        {l.device && (
                          <Badge variant="outline" className="text-xs">
                            {l.device}
                          </Badge>
                        )}
                        {l.interface && l.interface !== 'Global' && (
                          <Badge variant="secondary" className="text-xs">
                            {l.interface}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium">{l.message}</div>
                      {l.suggestion && (
                        <div className="mt-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded flex items-center gap-2">
                          <Lightbulb className="h-3 w-3" />
                          {l.suggestion}
                        </div>
                      )}
                      {l.metric && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Metric: {l.metric}
                          {l.value !== undefined && ` | Value: ${l.value}`}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                      {/* AI Troubleshoot Button for warnings and errors */}
                      {(l.level === "warn" || l.level === "error") && l.device && l.metric && (
                        <AITroubleshootModal
                          device={l.device}
                          metric={l.metric}
                          value={l.value}
                          suggestion={l.suggestion || ""}
                          severity={l.level}
                        >
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2 text-xs"
                            title="Get AI-powered troubleshooting solution"
                          >
                            <Bot className="h-3 w-3 mr-1" />
                            AI Fix
                          </Button>
                        </AITroubleshootModal>
                      )}
                      <Badge variant={l.level === "error" ? "destructive" : l.level === "warn" ? "secondary" : "outline"}>
                        {l.level.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
