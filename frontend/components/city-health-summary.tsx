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
  Activity,
  Building
} from 'lucide-react'
import { HealthChartCustomizer, ChartTypeSelector, ChartType } from '@/components/health-chart-customizer'

interface Office {
  _id: string
  office: string
  city: string
  country: string
  device_count: number
  status: string
}

interface CityHealthSummaryProps {
  offices: Office[]
  cityName: string
  totalOffices: number
  totalDevices: number
  className?: string
}

export function CityHealthSummary({ 
  offices, 
  cityName, 
  totalOffices, 
  totalDevices, 
  className = '' 
}: CityHealthSummaryProps) {
  const [chartType, setChartType] = useState<ChartType>('circular')
  const [showCustomizer, setShowCustomizer] = useState(false)
  // Calculate health statistics based on office status and device counts
  const activeOffices = offices.filter(office => office.status === 'active').length
  const inactiveOffices = offices.filter(office => office.status !== 'active').length
  const officesWithDevices = offices.filter(office => office.device_count > 0).length
  const officesWithoutDevices = offices.filter(office => office.device_count === 0).length

  // Calculate overall city health percentage
  let healthScore = 0
  if (totalOffices > 0) {
    // Calculate health based on offices that are both active AND have devices
    const healthyOffices = offices.filter(office => 
      office.status === 'active' && office.device_count > 0
    ).length
    
    // Health score is percentage of fully healthy offices (active + devices)
    healthScore = Math.round((healthyOffices / totalOffices) * 100)
  }

  // Determine overall health status
  let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical'
  let statusColor = 'text-red-400'

  if (healthScore >= 90) {
    healthStatus = 'excellent'
    statusColor = 'text-green-400'
  } else if (healthScore >= 75) {
    healthStatus = 'good'
    statusColor = 'text-blue-400'
  } else if (healthScore >= 50) {
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

  const handleCardClick = (e: React.MouseEvent) => {
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
              {cityName} Health By Office wise
            </h3>
            <ChartTypeSelector
              chartType={chartType}
              onChartTypeChange={setChartType}
              showCustomizer={showCustomizer}
              onCustomizerToggle={setShowCustomizer}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {totalOffices} office{totalOffices !== 1 ? 's' : ''} • {totalDevices} device{totalDevices !== 1 ? 's' : ''} total
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Office Status Legend */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Office Status Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Active Offices</span>
                <Badge variant="outline" className="ml-auto text-xs">{activeOffices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">With Devices</span>
                <Badge variant="outline" className="ml-auto text-xs">{officesWithDevices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Inactive</span>
                <Badge variant="outline" className="ml-auto text-xs">{inactiveOffices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">No Devices</span>
                <Badge variant="outline" className="ml-auto text-xs">{officesWithoutDevices}</Badge>
              </div>
            </div>
          </div>

          {/* Overall Health Customizable Chart */}
          <div className="flex flex-col items-center">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-6">Overall Health</h4>
            <HealthChartCustomizer
              healthScore={healthScore}
              status={healthStatus}
              size="xl"
              showDetails={true}
              className="mb-6"
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          </div>

          {/* Office List */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Office Status</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {offices.length > 0 ? (
                offices.map((office, index) => (
                  <div 
                    key={office._id} 
                    className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-sm ${
                      office.status === 'active' && office.device_count > 0 ? 'bg-green-500' :
                      office.status === 'active' && office.device_count === 0 ? 'bg-blue-500' :
                      office.status !== 'active' ? 'bg-orange-500' : 'bg-gray-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {office.office}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {office.device_count} device{office.device_count !== 1 ? 's' : ''} • {office.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No offices found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
