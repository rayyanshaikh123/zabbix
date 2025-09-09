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
  const healthyDevices = devices.filter(d => d.status === 'Up' || d.status === 'Operational').length;
  const degradedDevices = devices.filter(d => d.status === 'Idle').length;
  const downDevices = devices.filter(d => d.status === 'Down' || d.status === 'Offline').length;
  const totalDevices = devices.length > 0 ? devices.length : deviceCount;

  // Count 'Idle' devices as degraded (partial health)
  let healthyPercentage = totalDevices > 0 ? Math.round(((healthyDevices + 0.5 * degradedDevices) / totalDevices) * 100) : 0;
  let degradedPercentage = totalDevices > 0 ? Math.round((degradedDevices / totalDevices) * 100) : 0;
  let downPercentage = totalDevices > 0 ? Math.round((downDevices / totalDevices) * 100) : 0;

  let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
  let statusColor = 'text-red-400';
  if (healthyPercentage >= 90 && downDevices === 0) {
    healthStatus = 'excellent';
    statusColor = 'text-green-400';
  } else if (healthyPercentage >= 75) {
    healthStatus = 'good';
    statusColor = 'text-blue-400';
  } else if (degradedPercentage > 0) {
    healthStatus = 'warning';
    statusColor = 'text-orange-400';
  } else if (downPercentage > 0) {
    healthStatus = 'critical';
    statusColor = 'text-red-400';
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
      className={`glass-panel hover:shadow-lg transition-all duration-200 w-full max-w-7xl ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold text-slate-100">
              {officeName} 
            </h3>
            <ChartTypeSelector
              chartType={chartType}
              onChartTypeChange={setChartType}
              showCustomizer={showCustomizer}
              onCustomizerToggle={setShowCustomizer}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center">
            <h4 className="font-semibold text-slate-100 mb-6">Health Status</h4>
            <HealthChartCustomizer
              healthScore={healthyPercentage}
              status={healthStatus}
              size="xl"
              showDetails={true}
              className="mb-4"
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 mb-3">Devices</h4>
            <div className="max-h-72 overflow-y-auto border border-white/10 rounded-md">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <div key={device.hostid || device.device_id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5">
                    <span className={`w-2.5 h-2.5 rounded-full ${getDeviceStatusColor(device)}`}></span>
                    <span className="text-sm text-slate-200 truncate">{device.device_id}</span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-slate-400 text-sm">No devices</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
