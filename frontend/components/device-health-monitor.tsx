"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Cpu, 
  MemoryStick, 
  Network, 
  HardDrive, 
  Thermometer, 
  Clock, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { 
  DeviceHealthMetrics, 
  HealthScore, 
  HealthStatus, 
  calculateHealthScore, 
  getHealthStatus,
  getHealthColor,
  getHealthBgColor,
  getHealthBorderColor,
  getStatusIcon
} from '@/lib/health-monitoring'

interface DeviceHealthMonitorProps {
  deviceId: string
  hostid: string
  className?: string
}

export function DeviceHealthMonitor({ deviceId, hostid, className = '' }: DeviceHealthMonitorProps) {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHealthData()
  }, [hostid])

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch device metrics from API
      const response = await fetch(`/api/devices/${hostid}`)
      if (!response.ok) {
        throw new Error('Failed to fetch device data')
      }
      
      const data = await response.json()
      if (!data.device) {
        throw new Error('Device not found')
      }

      // Extract metrics from device data
      const metrics: DeviceHealthMetrics = {
        cpu: {
          utilization: data.device.system_metrics?.cpu?.utilization || 0,
          load: 0 // Could be calculated from multiple CPU cores
        },
        memory: {
          used: data.device.system_metrics?.memory?.used || 0,
          free: data.device.system_metrics?.memory?.free || 0,
          utilization: data.device.system_metrics?.memory?.utilization || 0
        },
        interfaces: {
          total: Object.keys(data.device.interfaces || {}).length,
          up: Object.values(data.device.interfaces || {}).filter((iface: any) => iface.status === 'Up').length,
          down: Object.values(data.device.interfaces || {}).filter((iface: any) => iface.status === 'Down').length,
          errors_in: Object.values(data.device.interfaces || {}).reduce((sum: number, iface: any) => sum + (iface.traffic?.errors_in || 0), 0),
          errors_out: Object.values(data.device.interfaces || {}).reduce((sum: number, iface: any) => sum + (iface.traffic?.errors_out || 0), 0),
          traffic_in: Object.values(data.device.interfaces || {}).reduce((sum: number, iface: any) => sum + (iface.traffic?.bits_received || 0), 0),
          traffic_out: Object.values(data.device.interfaces || {}).reduce((sum: number, iface: any) => sum + (iface.traffic?.bits_sent || 0), 0)
        },
        storage: {
          used: 0, // Not available in current data structure
          free: 0, // Not available in current data structure
          utilization: 0 // Not available in current data structure
        },
        temperature: {
          current: data.device.system_metrics?.hardware?.temperature || 0,
          status: data.device.system_metrics?.hardware?.temperature_status || 'Normal'
        },
        uptime: {
          seconds: data.device.system_info?.uptime_hardware || 0,
          days: (data.device.system_info?.uptime_hardware || 0) / (24 * 60 * 60)
        },
        errors: {
          critical: 0, // Would need to be calculated from alerts/events
          warning: 0, // Would need to be calculated from alerts/events
          total: 0 // Would need to be calculated from alerts/events
        },
        protocols: {
          tcp_established: 0, // Not available in current data structure
          udp_errors: 0, // Not available in current data structure
          icmp_errors: 0 // Not available in current data structure
        }
      }

      // Calculate health score and status
      const score = calculateHealthScore(metrics)
      const status = getHealthStatus(score)
      
      setHealthData(status)
    } catch (err) {
      console.error('Error fetching health data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Device Health Monitor
          </CardTitle>
          <CardDescription>Loading health metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Device Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!healthData) {
    return null
  }

  const { score, status, issues, recommendations } = healthData

  return (
    <Card className={`${className} ${getHealthBgColor(score.overall)} ${getHealthBorderColor(score.overall)}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Device Health Monitor
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getStatusIcon(status)}</span>
            <Badge 
              variant={status === 'excellent' ? 'default' : status === 'good' ? 'secondary' : status === 'warning' ? 'outline' : 'destructive'}
              className="text-sm"
            >
              {status.toUpperCase()}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Overall Health Score: <span className={`font-semibold ${getHealthColor(score.overall)}`}>{score.overall}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Health</span>
            <span className={getHealthColor(score.overall)}>{score.overall}%</span>
          </div>
          <Progress value={score.overall} className="h-3" />
        </div>

        {/* Health Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <Cpu className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-sm font-medium">CPU</div>
            <div className={`text-lg font-bold ${getHealthColor(score.cpu)}`}>{score.cpu}%</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <MemoryStick className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-sm font-medium">Memory</div>
            <div className={`text-lg font-bold ${getHealthColor(score.memory)}`}>{score.memory}%</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <Network className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-sm font-medium">Interfaces</div>
            <div className={`text-lg font-bold ${getHealthColor(score.interfaces)}`}>{score.interfaces}%</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <Thermometer className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <div className="text-sm font-medium">Temperature</div>
            <div className={`text-lg font-bold ${getHealthColor(score.temperature)}`}>{score.temperature}%</div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">CPU Utilization</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={score.cpu} className="w-20 h-2" />
              <span className={`text-sm font-medium ${getHealthColor(score.cpu)}`}>{score.cpu}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Memory Usage</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={score.memory} className="w-20 h-2" />
              <span className={`text-sm font-medium ${getHealthColor(score.memory)}`}>{score.memory}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Interface Health</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={score.interfaces} className="w-20 h-2" />
              <span className={`text-sm font-medium ${getHealthColor(score.interfaces)}`}>{score.interfaces}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Uptime Stability</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={score.uptime} className="w-20 h-2" />
              <span className={`text-sm font-medium ${getHealthColor(score.uptime)}`}>{score.uptime}%</span>
            </div>
          </div>
        </div>

        {/* Issues and Recommendations */}
        {issues.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Issues Detected
            </h4>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div key={index} className="text-sm text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950 p-2 rounded">
                  • {issue}
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  • {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
