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
  Building,
  Globe
} from 'lucide-react'
import { HealthChartCustomizer, ChartTypeSelector, ChartType } from '@/components/health-chart-customizer'

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
  const [chartType, setChartType] = useState<ChartType>('circular')
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [showCities, setShowCities] = useState(true)
  // Calculate health statistics based on city data
  const healthyCities = cities.filter(city => city.totalOffices > 0 && city.totalDevices > 0).length;
  const degradedCities = cities.filter(city => city.totalOffices > 0 && city.totalDevices === 0).length;
  const downCities = cities.filter(city => city.totalOffices === 0).length;

  let healthScore = 0;
  if (cities.length > 0) {
    healthScore = Math.round((healthyCities / cities.length) * 100);
  }
  let degradedPercentage = cities.length > 0 ? Math.round((degradedCities / cities.length) * 100) : 0;
  let downPercentage = cities.length > 0 ? Math.round((downCities / cities.length) * 100) : 0;

  // Determine overall health status
  let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
  let statusColor = 'text-red-400';
  if (healthScore >= 90 && downCities === 0) {
    healthStatus = 'excellent';
    statusColor = 'text-green-400';
  } else if (healthScore >= 75) {
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
      className={`glass-panel hover:shadow-lg transition-all duration-200 w-full max-w-7xl `}
      onClick={handleCardClick}
    >
      <CardContent className=" ">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold text-slate-100">
              {countryName} Overall Health
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
            <h4 className="font-semibold text-slate-100 mb-6">Overall Health</h4>
            <HealthChartCustomizer
              healthScore={healthScore}
              status={healthStatus}
              size="xl"
              showDetails={true}
              className="mb-2"
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 mb-3">Cities</h4>
            <div className="max-h-72 overflow-y-auto border border-white/10 rounded-md">
              {cities.length > 0 ? (
                cities.map((city) => {
                  const colorClass = city.totalOffices > 0 && city.totalDevices > 0
                    ? 'bg-green-500'
                    : city.totalOffices > 0 && city.totalDevices === 0
                      ? 'bg-blue-500'
                      : city.totalOffices === 0
                        ? 'bg-orange-500'
                        : 'bg-gray-500'
                  return (
                    <div key={city.city} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                      <span className="text-sm text-slate-200">{city.city}</span>
                    </div>
                  )
                })
              ) : (
                <div className="px-3 py-6 text-slate-400 text-sm">No cities</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
