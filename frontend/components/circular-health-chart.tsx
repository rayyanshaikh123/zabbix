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
  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-xs', stroke: 'stroke-2' },
    md: { container: 'w-24 h-24', text: 'text-sm', stroke: 'stroke-2' },
    lg: { container: 'w-32 h-32', text: 'text-lg', stroke: 'stroke-3' },
    xl: { container: 'w-48 h-48', text: 'text-2xl', stroke: 'stroke-4' }
  }

  const colors = {
    excellent: { bg: 'text-green-100', progress: 'text-green-600', badge: 'bg-green-100 text-green-800' },
    good: { bg: 'text-blue-100', progress: 'text-blue-600', badge: 'bg-blue-100 text-blue-800' },
    warning: { bg: 'text-orange-100', progress: 'text-orange-600', badge: 'bg-orange-100 text-orange-800' },
    critical: { bg: 'text-red-100', progress: 'text-red-600', badge: 'bg-red-100 text-red-800' }
  }

  const currentSize = sizeClasses[size]
  const currentColors = colors[status]

  // Calculate the circumference and stroke-dasharray for the progress circle
  const radius = size === 'sm' ? 24 : size === 'md' ? 36 : size === 'lg' ? 48 : 64
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (healthScore / 100) * circumference

  const getStatusIcon = () => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'good': return <Activity className="h-4 w-4 text-blue-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'excellent': return 'Excellent'
      case 'good': return 'Good'
      case 'warning': return 'Warning'
      case 'critical': return 'Critical'
      default: return 'Unknown'
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg 
          className={`${currentSize.container} transform -rotate-90`}
          viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
        >
          {/* Background circle */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            className={`${currentColors.bg} ${currentSize.stroke}`}
            strokeWidth="4"
          />
          
          {/* Progress circle */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            className={`${currentColors.progress} ${currentSize.stroke}`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out'
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-bold ${currentSize.text} ${currentColors.progress}`}>
            {healthScore}%
          </div>
          {size !== 'sm' && (
            <div className="text-xs text-muted-foreground mt-1">
              Health
            </div>
          )}
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-3 text-center">
          <Badge variant="outline" className={`${currentColors.badge} text-xs`}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </div>
      )}
    </div>
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
            <CircularHealthChart 
              healthScore={healthScore}
              status={status}
              size="md"
              showDetails={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
