"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  TrendingDown,
  Activity
} from 'lucide-react'

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

interface HealthStats {
  healthy: number
  down: number
  critical: number
  unknown: number
  degraded: number
  total: number
}

interface HealthDashboardProps {
  devices: Device[]
  officeName: string
  className?: string
}

export function HealthDashboard({ devices, officeName, className = '' }: HealthDashboardProps) {
  // Calculate health statistics
  const healthStats: HealthStats = {
    healthy: devices.filter(d => d.severity === 'info' || d.severity === 'healthy' || d.status === 'Operational').length,
    down: devices.filter(d => d.status === 'Down' || d.status === 'Offline').length,
    critical: devices.filter(d => d.severity === 'critical' || d.severity === 'error').length,
    unknown: devices.filter(d => d.severity === 'unknown' || !d.severity).length,
    degraded: devices.filter(d => d.severity === 'warning').length,
    total: devices.length
  }

  // Improved overall health calculation
  let overallLabel = 'Healthy';
  let overallPercent = 0;
  if (healthStats.total > 0) {
    if (healthStats.healthy > 0) {
      overallPercent = Math.round((healthStats.healthy / healthStats.total) * 100);
      overallLabel = 'Healthy';
    } else if (healthStats.degraded > 0) {
      overallPercent = Math.round((healthStats.degraded / healthStats.total) * 100);
      overallLabel = 'Degraded';
    } else if (healthStats.critical > 0) {
      overallPercent = Math.round((healthStats.critical / healthStats.total) * 100);
      overallLabel = 'Critical';
    } else if (healthStats.down > 0) {
      overallPercent = 0;
      overallLabel = 'Down';
    } else {
      overallPercent = 0;
      overallLabel = 'Unknown';
    }
  }

  // Donut chart data
  const donutData = [
    { label: 'Healthy', value: healthStats.healthy, color: '#10B981', percentage: Math.round((healthStats.healthy / healthStats.total) * 100) },
    { label: 'Down', value: healthStats.down, color: '#EF4444', percentage: Math.round((healthStats.down / healthStats.total) * 100) },
    { label: 'Critical', value: healthStats.critical, color: '#F59E0B', percentage: Math.round((healthStats.critical / healthStats.total) * 100) },
    { label: 'Unknown', value: healthStats.unknown, color: '#6B7280', percentage: Math.round((healthStats.unknown / healthStats.total) * 100) },
    { label: 'Degraded', value: healthStats.degraded, color: '#F59E0B', percentage: Math.round((healthStats.degraded / healthStats.total) * 100) }
  ].filter(item => item.value > 0)

  // Calculate donut chart segments
  const radius = 80
  const circumference = 2 * Math.PI * radius
  let cumulativePercentage = 0

  const getDeviceStatusIcon = (device: Device) => {
    if (device.status === 'Down' || device.status === 'Offline') {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (device.severity === 'critical' || device.severity === 'error') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    }
    if (device.severity === 'warning') {
      return <TrendingDown className="h-4 w-4 text-yellow-500" />
    }
    if (device.severity === 'unknown' || !device.severity) {
      return <HelpCircle className="h-4 w-4 text-gray-500" />
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="glass-panel p-4 flex items-center justify-between" style={{ ['--glass-radius' as any]: '8px' }}>
        <h2 className="text-2xl font-bold text-slate-100">
          {officeName} Health By Device wise
        </h2>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-200" />
          <span className="text-sm text-slate-300">
            {healthStats.total} devices total
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Legend */}
        <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">Health Status Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-slate-300">Healthy</span>
              <Badge variant="outline" className="ml-auto">{healthStats.healthy}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-slate-300">Down</span>
              <Badge variant="outline" className="ml-auto">{healthStats.down}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-slate-300">Critical</span>
              <Badge variant="outline" className="ml-auto">{healthStats.critical}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <span className="text-sm text-slate-300">Unknown</span>
              <Badge variant="outline" className="ml-auto">{healthStats.unknown}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-slate-300">Degraded</span>
              <Badge variant="outline" className="ml-auto">{healthStats.degraded}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">Overall Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="20"
                />
                
                {/* Data segments */}
                {donutData.map((segment, index) => {
                  const segmentPercentage = (segment.value / healthStats.total) * 100
                  const strokeDasharray = circumference
                  const strokeDashoffset = circumference - (segmentPercentage / 100) * circumference
                  
                  const startAngle = (cumulativePercentage / 100) * 360
                  cumulativePercentage += segmentPercentage
                  
                  return (
                    <circle
                      key={index}
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        transition: 'stroke-dashoffset 0.5s ease-in-out'
                      }}
                    />
                  )
                })}
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-slate-100">
                  {overallPercent}%
                </div>
                <div className="text-sm text-slate-300">{overallLabel}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device List */}
        <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {devices.length > 0 ? (
                devices.map((device, index) => (
                  <div 
                    key={device.hostid} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-sm ${getDeviceStatusColor(device)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {device.device_id}
                      </div>
                      <div className="text-xs text-slate-400">
                        {device.deviceType} • {device.interface_count} interfaces
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getDeviceStatusIcon(device)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No devices found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-slate-100">{healthStats.healthy}</div>
                <div className="text-xs text-slate-400">Healthy</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-slate-100">{healthStats.down}</div>
                <div className="text-xs text-slate-400">Down</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-slate-100">{healthStats.critical}</div>
                <div className="text-xs text-slate-400">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold text-slate-100">{healthStats.unknown}</div>
                <div className="text-xs text-slate-400">Unknown</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
