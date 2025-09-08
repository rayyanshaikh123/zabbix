"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  TrendingDown,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { HealthChartCustomizer, ChartTypeSelector, ChartType } from '@/components/health-chart-customizer'

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

interface OfficeHealthSummaryProps {
  devices: Device[]
  officeName: string
  deviceCount: number
  className?: string
}

export function OfficeHealthSummary({ 
  devices, 
  officeName, 
  deviceCount, 
  className = '' 
}: OfficeHealthSummaryProps) {
  const [chartType, setChartType] = useState<ChartType>('circular')
  const [showCustomizer, setShowCustomizer] = useState(false)
  // Calculate health statistics - fix the logic
  const healthyDevices = devices.filter(d => 
    (d.status === 'Up' || d.status === 'Operational') && 
    (d.severity === 'info' || d.severity === 'healthy' || !d.severity)
  ).length
  
  const downDevices = devices.filter(d => 
    d.status === 'Down' || d.status === 'Offline'
  ).length
  
  const criticalDevices = devices.filter(d => 
    d.severity === 'critical' || d.severity === 'error'
  ).length
  
  const warningDevices = devices.filter(d => 
    d.severity === 'warning'
  ).length
  
  const unknownDevices = devices.filter(d => 
    d.severity === 'unknown' || (!d.severity && d.status !== 'Up' && d.status !== 'Operational')
  ).length

  // Calculate healthy percentage based on actual device count
  // Use deviceCount prop when devices array is empty (fallback to database count)
  const totalDevices = devices.length > 0 ? devices.length : deviceCount
  let healthyPercentage = totalDevices > 0 ? Math.round((healthyDevices / totalDevices) * 100) : 0
  
  // If we have device count but no actual device data, assume 100% healthy
  if (devices.length === 0 && deviceCount > 0) {
    healthyPercentage = 100
  }

  // Determine overall health status
  let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical'
  let statusColor = 'text-red-400'

  // If we have device count but no actual device data, assume healthy
  if (devices.length === 0 && deviceCount > 0) {
    healthStatus = 'excellent'
    statusColor = 'text-green-400'
  } else if (healthyPercentage >= 90 && criticalDevices === 0 && downDevices === 0) {
    healthStatus = 'excellent'
    statusColor = 'text-green-400'
  } else if (healthyPercentage >= 75 && criticalDevices === 0) {
    healthStatus = 'good'
    statusColor = 'text-blue-400'
  } else if (healthyPercentage >= 50) {
    healthStatus = 'warning'
    statusColor = 'text-orange-400'
  }

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'good': return <Activity className="h-4 w-4 text-blue-400" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-400" />
      case 'critical': return <XCircle className="h-4 w-4 text-red-400" />
      default: return <HelpCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getDeviceStatusColor = (device: Device) => {
    if (device.status === 'Down' || device.status === 'Offline') {
      return 'bg-red-500'
    }
    if (device.severity === 'critical' || device.severity === 'error') {
      return 'bg-orange-500'
    }
    if (device.severity === 'warning') {
      return 'bg-yellow-500'
    }
    if (device.severity === 'unknown' || !device.severity) {
      return 'bg-gray-500'
    }
    return 'bg-green-500'
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't prevent default if clicking on chart controls
    const target = e.target as HTMLElement
    if (target.closest('[data-chart-controls]')) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-200 w-full max-w-7xl ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {officeName} Health By Device wise
            </h3>
            <ChartTypeSelector
              chartType={chartType}
              onChartTypeChange={setChartType}
              showCustomizer={showCustomizer}
              onCustomizerToggle={setShowCustomizer}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {totalDevices} device{totalDevices !== 1 ? 's' : ''} total
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Health Status Legend */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Health Status Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Healthy</span>
                <Badge variant="outline" className="ml-auto text-xs">{healthyDevices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Down</span>
                <Badge variant="outline" className="ml-auto text-xs">{downDevices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Critical</span>
                <Badge variant="outline" className="ml-auto text-xs">{criticalDevices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Unknown</span>
                <Badge variant="outline" className="ml-auto text-xs">{unknownDevices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Degraded</span>
                <Badge variant="outline" className="ml-auto text-xs">{warningDevices}</Badge>
              </div>
            </div>
          </div>

          {/* Overall Health Customizable Chart */}
          <div className="flex flex-col items-center">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-6">Overall Health</h4>
            <HealthChartCustomizer
              healthScore={healthyPercentage}
              status={healthStatus}
              size="xl"
              showDetails={true}
              className="mb-6"
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          </div>

          {/* Device List */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Device Status</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {devices.length > 0 ? (
                devices.map((device, index) => (
                  <Link 
                    key={device.hostid} 
                    href={`/devices/${device.hostid}`}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className={`w-3 h-3 rounded-sm ${getDeviceStatusColor(device)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {device.device_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {device.deviceType} • {device.interface_count} interfaces
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No devices found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
