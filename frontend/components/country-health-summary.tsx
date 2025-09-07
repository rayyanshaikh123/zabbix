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
  Building,
  Globe
} from 'lucide-react'

interface City {
  city: string
  totalOffices: number
  totalDevices: number
  offices: any[]
}

interface CountryHealthSummaryProps {
  cities: City[]
  countryName: string
  totalOffices: number
  totalDevices: number
  className?: string
}

export function CountryHealthSummary({ 
  cities, 
  countryName, 
  totalOffices, 
  totalDevices, 
  className = '' 
}: CountryHealthSummaryProps) {
  // Calculate health statistics based on city data
  const citiesWithOffices = cities.filter(city => city.totalOffices > 0).length
  const citiesWithDevices = cities.filter(city => city.totalDevices > 0).length
  const citiesWithoutOffices = cities.filter(city => city.totalOffices === 0).length
  const citiesWithoutDevices = cities.filter(city => city.totalDevices === 0).length

  // Calculate overall country health percentage
  let healthScore = 0
  if (cities.length > 0) {
    // Calculate health based on cities that have both offices AND devices
    const healthyCities = cities.filter(city => 
      city.totalOffices > 0 && city.totalDevices > 0
    ).length
    
    // Health score is percentage of fully healthy cities (offices + devices)
    healthScore = Math.round((healthyCities / cities.length) * 100)
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
            {countryName} Health By City wise
          </h3>
          <p className="text-sm text-muted-foreground">
            {cities.length} cit{cities.length !== 1 ? 'ies' : 'y'} • {totalOffices} office{totalOffices !== 1 ? 's' : ''} • {totalDevices} device{totalDevices !== 1 ? 's' : ''} total
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* City Status Legend */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">City Status Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">With Offices</span>
                <Badge variant="outline" className="ml-auto text-xs">{citiesWithOffices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">With Devices</span>
                <Badge variant="outline" className="ml-auto text-xs">{citiesWithDevices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">No Offices</span>
                <Badge variant="outline" className="ml-auto text-xs">{citiesWithoutOffices}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">No Devices</span>
                <Badge variant="outline" className="ml-auto text-xs">{citiesWithoutDevices}</Badge>
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

          {/* City List */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">City Status</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {cities.length > 0 ? (
                cities.map((city, index) => (
                  <div 
                    key={city.city} 
                    className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-sm ${
                      city.totalOffices > 0 && city.totalDevices > 0 ? 'bg-green-500' :
                      city.totalOffices > 0 && city.totalDevices === 0 ? 'bg-blue-500' :
                      city.totalOffices === 0 ? 'bg-orange-500' : 'bg-gray-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {city.city}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {city.totalOffices} office{city.totalOffices !== 1 ? 's' : ''} • {city.totalDevices} device{city.totalDevices !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cities found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
