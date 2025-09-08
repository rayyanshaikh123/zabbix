"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { HealthChartCustomizer } from '@/components/health-chart-customizer'

interface CircularHealthChartProps {
  healthScore: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDetails?: boolean
  className?: string
}

export function CircularHealthChart({ 
  healthScore, 
  status, 
  size = 'md',
  showDetails = false,
  className = '' 
}: CircularHealthChartProps) {
  return (
    <HealthChartCustomizer
      healthScore={healthScore}
      status={status}
      size={size}
      showDetails={showDetails}
      className={className}
      defaultChartType="circular"
    />
  )
}

interface OfficeHealthCardProps {
  officeName: string
  deviceCount: number
  healthScore: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  healthyDevices: number
  warningDevices: number
  criticalDevices: number
  className?: string
}

export function OfficeHealthCard({
  officeName,
  deviceCount,
  healthScore,
  status,
  healthyDevices,
  warningDevices,
  criticalDevices,
  className = ''
}: OfficeHealthCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
      case 'good': return 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800'
      case 'warning': return 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800'
      case 'critical': return 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-800'
    }
  }

  return (
    <Card className={`${getStatusColor()} hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{officeName}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {deviceCount} device{deviceCount !== 1 ? 's' : ''}
            </p>
            
            {/* Device Status Summary */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-700 dark:text-green-300">{healthyDevices}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span className="text-orange-700 dark:text-orange-300">{warningDevices}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                <span className="text-red-700 dark:text-red-300">{criticalDevices}</span>
              </div>
            </div>
          </div>
          
          <div className="ml-4">
            <HealthChartCustomizer 
              healthScore={healthScore}
              status={status}
              size="md"
              showDetails={false}
              defaultChartType="circular"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
