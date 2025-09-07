"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building, 
  Server, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Info,
  Cpu,
  MemoryStick,
  Network,
  Thermometer,
  Clock
} from 'lucide-react'
import { 
  HealthScore, 
  HealthStatus, 
  calculateHealthScore, 
  getHealthStatus,
  getHealthColor,
  getHealthBgColor,
  getHealthBorderColor,
  getStatusIcon
} from '@/lib/health-monitoring'

interface Device {
  hostid: string
  device_id: string
  status: string
  severity: string
  last_seen: Date
  deviceType: string
  location: string
  interface_count: number
  total_metrics: number
}

interface OfficeHealthOverviewProps {
  devices: Device[]
  className?: string
}

interface OfficeHealthMetrics {
  totalDevices: number
  healthyDevices: number
  warningDevices: number
  criticalDevices: number
  offlineDevices: number
  averageHealthScore: number
  totalInterfaces: number
  upInterfaces: number
  downInterfaces: number
  totalErrors: number
  networkHealth: number
}

export function OfficeHealthOverview({ devices, className = '' }: OfficeHealthOverviewProps) {
  const [officeHealth, setOfficeHealth] = useState<OfficeHealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    calculateOfficeHealth()
  }, [devices])

  const calculateOfficeHealth = async () => {
    try {
      setLoading(true)
      
      let totalHealthScore = 0
      let deviceCount = 0
      let totalInterfaces = 0
      let upInterfaces = 0
      let downInterfaces = 0
      let totalErrors = 0

      // Calculate health for each device
      for (const device of devices) {
        try {
          const response = await fetch(`/api/devices/${device.hostid}`)
          if (response.ok) {
            const data = await response.json()
            if (data.device) {
              // Calculate device health score (simplified version)
              const deviceHealth = calculateDeviceHealthScore(data.device)
              totalHealthScore += deviceHealth
              deviceCount++
              
              // Count interfaces
              const interfaces = Object.values(data.device.interfaces || {})
              totalInterfaces += interfaces.length
              upInterfaces += interfaces.filter((iface: any) => iface.status === 'Up').length
              downInterfaces += interfaces.filter((iface: any) => iface.status === 'Down').length
              
              // Count errors
              totalErrors += interfaces.reduce((sum: number, iface: any) => 
                sum + (iface.traffic?.errors_in || 0) + (iface.traffic?.errors_out || 0), 0)
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch health for device ${device.device_id}:`, error)
        }
      }

      const averageHealthScore = deviceCount > 0 ? Math.round(totalHealthScore / deviceCount) : 0
      const networkHealth = totalInterfaces > 0 ? Math.round((upInterfaces / totalInterfaces) * 100) : 0

      const metrics: OfficeHealthMetrics = {
        totalDevices: devices.length,
        healthyDevices: devices.filter(d => d.severity === 'info' || d.severity === 'healthy').length,
        warningDevices: devices.filter(d => d.severity === 'warning').length,
        criticalDevices: devices.filter(d => d.severity === 'critical' || d.severity === 'error').length,
        offlineDevices: devices.filter(d => d.status === 'Down' || d.status === 'Offline').length,
        averageHealthScore,
        totalInterfaces,
        upInterfaces,
        downInterfaces,
        totalErrors,
        networkHealth
      }

      setOfficeHealth(metrics)
    } catch (error) {
      console.error('Error calculating office health:', error)
    } finally {
      setLoading(false)
    }
  }

  // Simplified device health calculation
  const calculateDeviceHealthScore = (device: any): number => {
    let score = 100

    // CPU penalty
    const cpuUtil = device.system_metrics?.cpu?.utilization || 0
    if (cpuUtil > 90) score -= 30
    else if (cpuUtil > 75) score -= 20
    else if (cpuUtil > 50) score -= 10

    // Memory penalty
    const memUtil = device.system_metrics?.memory?.utilization || 0
    if (memUtil > 90) score -= 25
    else if (memUtil > 75) score -= 15
    else if (memUtil > 50) score -= 5

    // Interface penalty
    const interfaces = Object.values(device.interfaces || {})
    const downInterfaces = interfaces.filter((iface: any) => iface.status === 'Down').length
    if (downInterfaces > 0) score -= (downInterfaces / interfaces.length) * 40

    // Temperature penalty
    const temp = device.system_metrics?.hardware?.temperature || 0
    if (temp > 70) score -= 20
    else if (temp > 50) score -= 10

    return Math.max(0, score)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Office Health Overview
          </CardTitle>
          <CardDescription>Calculating office health metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!officeHealth) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Office Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to calculate office health metrics</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const { 
    totalDevices, 
    healthyDevices, 
    warningDevices, 
    criticalDevices, 
    offlineDevices,
    averageHealthScore,
    totalInterfaces,
    upInterfaces,
    downInterfaces,
    totalErrors,
    networkHealth
  } = officeHealth

  const getOverallStatus = (score: number): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (score >= 90) return 'excellent'
    if (score >= 75) return 'good'
    if (score >= 50) return 'warning'
    return 'critical'
  }

  const overallStatus = getOverallStatus(averageHealthScore)

  return (
    <Card className={`${className} ${getHealthBgColor(averageHealthScore)} ${getHealthBorderColor(averageHealthScore)}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Office Health Overview
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getStatusIcon(overallStatus)}</span>
            <Badge 
              variant={overallStatus === 'excellent' ? 'default' : overallStatus === 'good' ? 'secondary' : overallStatus === 'warning' ? 'outline' : 'destructive'}
              className="text-sm"
            >
              {overallStatus.toUpperCase()}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Average Health Score: <span className={`font-semibold ${getHealthColor(averageHealthScore)}`}>{averageHealthScore}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Office Health</span>
            <span className={getHealthColor(averageHealthScore)}>{averageHealthScore}%</span>
          </div>
          <Progress value={averageHealthScore} className="h-3" />
        </div>

        {/* Device Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-sm font-medium">Healthy</div>
            <div className="text-lg font-bold text-green-600">{healthyDevices}</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <div className="text-sm font-medium">Warning</div>
            <div className="text-lg font-bold text-orange-600">{warningDevices}</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <div className="text-sm font-medium">Critical</div>
            <div className="text-lg font-bold text-red-600">{criticalDevices}</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <Server className="h-6 w-6 mx-auto mb-2 text-gray-600" />
            <div className="text-sm font-medium">Offline</div>
            <div className="text-lg font-bold text-gray-600">{offlineDevices}</div>
          </div>
        </div>

        {/* Network Health */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Network className="h-4 w-4 text-blue-600" />
            Network Health
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Interface Status</span>
                <span className={`text-sm font-medium ${getHealthColor(networkHealth)}`}>{networkHealth}%</span>
              </div>
              <Progress value={networkHealth} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {upInterfaces} up / {totalInterfaces} total
              </div>
            </div>
            
            <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Error Rate</span>
                <span className={`text-sm font-medium ${totalErrors === 0 ? 'text-green-600' : totalErrors < 100 ? 'text-orange-600' : 'text-red-600'}`}>
                  {totalErrors}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Total interface errors
              </div>
            </div>
          </div>
        </div>

        {/* Health Summary */}
        <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            Health Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Total Devices</div>
              <div className="font-semibold">{totalDevices}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Health Score</div>
              <div className={`font-semibold ${getHealthColor(averageHealthScore)}`}>{averageHealthScore}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Network Health</div>
              <div className={`font-semibold ${getHealthColor(networkHealth)}`}>{networkHealth}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Interfaces</div>
              <div className="font-semibold">{totalInterfaces}</div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {averageHealthScore < 75 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {averageHealthScore < 50 
                ? "Critical issues detected. Immediate attention required for device maintenance and network optimization."
                : "Some devices require attention. Consider reviewing device configurations and network health."
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
