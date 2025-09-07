"use client"

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

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 w-full max-w-6xl ${className}`}>
      <CardContent className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {cityName} Health By Office wise
          </h3>
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

          {/* Overall Health Donut Chart */}
          <div className="flex flex-col items-center">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-6">Overall Health</h4>
            <div className="relative w-48 h-48 mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.1)"
                  strokeWidth="6"
                />
                
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={healthStatus === 'excellent' ? '#10B981' : 
                         healthStatus === 'good' ? '#3B82F6' : 
                         healthStatus === 'warning' ? '#F59E0B' : '#EF4444'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthScore / 100)}`}
                  style={{
                    transition: 'stroke-dashoffset 0.5s ease-in-out'
                  }}
                />
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-4xl font-bold ${statusColor}`}>
                  {healthScore}%
                </div>
                <div className="text-lg text-muted-foreground font-medium">Healthy</div>
              </div>
            </div>
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
