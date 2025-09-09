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
  const healthyOffices = offices.filter(office => office.status === 'active' && office.device_count > 0).length;
  const degradedOffices = offices.filter(office => office.status === 'active' && office.device_count === 0).length;
  const downOffices = offices.filter(office => office.status !== 'active').length;

  let healthScore = 0;
  if (totalOffices > 0) {
    healthScore = Math.round((healthyOffices / totalOffices) * 100);
  }
  let degradedPercentage = totalOffices > 0 ? Math.round((degradedOffices / totalOffices) * 100) : 0;
  let downPercentage = totalOffices > 0 ? Math.round((downOffices / totalOffices) * 100) : 0;

  // Determine overall health status
  let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical'
  let statusColor = 'text-red-400'

  if (healthScore >= 90 && downOffices === 0) {
    healthStatus = 'excellent'
    statusColor = 'text-green-400'
  } else if (healthScore >= 75) {
    healthStatus = 'good'
    statusColor = 'text-blue-400'
  } else if (degradedPercentage > 0) {
    healthStatus = 'warning'
    statusColor = 'text-orange-400'
  } else if (downPercentage > 0) {
    healthStatus = 'critical'
    statusColor = 'text-red-400'
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
      className={`glass-panel hover:shadow-lg transition-all duration-200 w-full max-w-7xl ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold text-slate-100">
              {cityName} Overall Health
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
            <h4 className="font-semibold text-slate-100 mb-3">Offices</h4>
            <div className="max-h-72 overflow-y-auto border border-white/10 rounded-md">
              {offices.length > 0 ? (
                offices.map((office) => {
                  const colorClass = (office.status === 'active' && office.device_count > 0)
                    ? 'bg-green-500'
                    : (office.status === 'active' && office.device_count === 0)
                      ? 'bg-blue-500'
                      : (office.status !== 'active')
                        ? 'bg-orange-500'
                        : 'bg-gray-500'
                  return (
                    <div key={office._id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                      <span className="text-sm text-slate-200 truncate">{office.office}</span>
                    </div>
                  )
                })
              ) : (
                <div className="px-3 py-6 text-slate-400 text-sm">No offices</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
