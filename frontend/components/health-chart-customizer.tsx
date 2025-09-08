"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  BarChart3,
  PieChart,
  TrendingUp,
  Settings
} from 'lucide-react'

export type ChartType = 'circular' | 'bar' | 'pie' | 'line'

interface HealthChartCustomizerProps {
  healthScore: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDetails?: boolean
  className?: string
  onChartTypeChange?: (chartType: ChartType) => void
  defaultChartType?: ChartType
  showCustomizer?: boolean
  onCustomizerToggle?: (show: boolean) => void
  chartType?: ChartType
}

export function HealthChartCustomizer({ 
  healthScore, 
  status, 
  size = 'md',
  showDetails = false,
  className = '',
  onChartTypeChange,
  defaultChartType = 'circular',
  showCustomizer = false,
  onCustomizerToggle,
  chartType: propChartType
}: HealthChartCustomizerProps) {
  const [internalChartType, setInternalChartType] = useState<ChartType>(defaultChartType)
  
  // Use prop chartType if provided, otherwise use internal state
  const chartType = propChartType || internalChartType

  // Sync internal state with prop changes
  useEffect(() => {
    if (propChartType) {
      setInternalChartType(propChartType)
    } else {
      setInternalChartType(defaultChartType)
    }
  }, [propChartType, defaultChartType])

  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-xs', stroke: 'stroke-2' },
    md: { container: 'w-24 h-24', text: 'text-sm', stroke: 'stroke-2' },
    lg: { container: 'w-32 h-32', text: 'text-lg', stroke: 'stroke-3' },
    xl: { container: 'w-48 h-48', text: 'text-2xl', stroke: 'stroke-4' }
  }

  const colors = {
    excellent: { 
      bg: 'stroke-green-200', 
      progress: 'stroke-green-600', 
      text: 'text-green-600',
      fill: 'bg-green-600',
      badge: 'bg-green-100 text-green-800' 
    },
    good: { 
      bg: 'stroke-blue-200', 
      progress: 'stroke-blue-600', 
      text: 'text-blue-600',
      fill: 'bg-blue-600',
      badge: 'bg-blue-100 text-blue-800' 
    },
    warning: { 
      bg: 'stroke-orange-200', 
      progress: 'stroke-orange-600', 
      text: 'text-orange-600',
      fill: 'bg-orange-600',
      badge: 'bg-orange-100 text-orange-800' 
    },
    critical: { 
      bg: 'stroke-red-200', 
      progress: 'stroke-red-600', 
      text: 'text-red-600',
      fill: 'bg-red-600',
      badge: 'bg-red-100 text-red-800' 
    }
  }

  const currentSize = sizeClasses[size]
  const currentColors = colors[status]

  const handleChartTypeChange = (newType: ChartType) => {
    setInternalChartType(newType)
    onChartTypeChange?.(newType)
  }

  const handleCustomizerToggle = () => {
    const newShow = !showCustomizer
    onCustomizerToggle?.(newShow)
  }

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

  // Circular Chart Component
  const CircularChart = () => {
    const radius = size === 'sm' ? 24 : size === 'md' ? 36 : size === 'lg' ? 48 : 64
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (healthScore / 100) * circumference

    return (
      <div className="relative">
        <svg 
          className={`${currentSize.container} transform -rotate-90`}
          viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
        >
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            className={`${currentColors.bg} ${currentSize.stroke}`}
            strokeWidth="4"
          />
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            className={`${currentColors.text} ${currentSize.stroke}`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-bold ${currentSize.text} ${currentColors.text}`}>
            {healthScore}%
          </div>
          {size !== 'sm' && (
            <div className="text-xs text-muted-foreground mt-1">Health</div>
          )}
        </div>
      </div>
    )
  }

  // Bar Chart Component
  const BarChart = () => {
    const barHeight = size === 'sm' ? 40 : size === 'md' ? 60 : size === 'lg' ? 80 : 120
    const barWidth = size === 'sm' ? 8 : size === 'md' ? 12 : size === 'lg' ? 16 : 24
    const fillHeight = (healthScore / 100) * barHeight

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative w-4 h-24 flex items-end justify-center">
          {/* Background bar */}
          <div className="absolute w-full h-full bg-gray-200 dark:bg-gray-700 rounded-t" />
          {/* Progress bar */}
          <div 
            className={`w-full rounded-t transition-all duration-500 ${currentColors.fill}`}
            style={{ height: `${fillHeight}px` }}
          />
        </div>
        <div className={`font-bold ${currentSize.text} ${currentColors.text} mt-2`}>
          {healthScore}%
        </div>
        {size !== 'sm' && (
          <div className="text-xs text-muted-foreground mt-1">Health</div>
        )}
      </div>
    )
  }

  // Pie Chart Component
  const PieChart = () => {
    const radius = size === 'sm' ? 20 : size === 'md' ? 30 : size === 'lg' ? 40 : 60
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (healthScore / 100) * circumference

    return (
      <div className="relative">
        <svg 
          className={`${currentSize.container}`}
          viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
        >
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            className={`${currentColors.bg} ${currentSize.stroke}`}
            strokeWidth="8"
          />
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            className={`${currentColors.text} ${currentSize.stroke}`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-bold ${currentSize.text} ${currentColors.text}`}>
            {healthScore}%
          </div>
          {size !== 'sm' && (
            <div className="text-xs text-muted-foreground mt-1">Health</div>
          )}
        </div>
      </div>
    )
  }

  // Line Chart Component
  const LineChart = () => {
    const chartWidth = size === 'sm' ? 60 : size === 'md' ? 80 : size === 'lg' ? 100 : 120
    const chartHeight = size === 'sm' ? 40 : size === 'md' ? 60 : size === 'lg' ? 80 : 100
    
    // Create a simple line chart showing health trend
    const points = [
      { x: 10, y: chartHeight - 10 },
      { x: chartWidth * 0.3, y: chartHeight - (chartHeight * 0.3) },
      { x: chartWidth * 0.6, y: chartHeight - (chartHeight * 0.5) },
      { x: chartWidth * 0.9, y: chartHeight - (chartHeight * (healthScore / 100)) }
    ]
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ')

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <svg 
          className={`${currentSize.container}`}
          viewBox={`0 0 ${chartWidth + 20} ${chartHeight + 20}`}
        >
          <path
            d={pathData}
            fill="none"
            className={`${currentColors.progress} ${currentSize.stroke}`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            className={`${currentColors.fill.replace('bg-', 'fill-')}`}
          />
        </svg>
        <div className={`font-bold ${currentSize.text} ${currentColors.text} mt-2`}>
          {healthScore}%
        </div>
        {size !== 'sm' && (
          <div className="text-xs text-muted-foreground mt-1">Health</div>
        )}
      </div>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'circular': return <CircularChart />
      case 'bar': return <BarChart />
      case 'pie': return <PieChart />
      case 'line': return <LineChart />
      default: return <CircularChart />
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {renderChart()}
      
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

// Separate component for chart type selector
interface ChartTypeSelectorProps {
  chartType: ChartType
  onChartTypeChange: (chartType: ChartType) => void
  showCustomizer: boolean
  onCustomizerToggle: (show: boolean) => void
  className?: string
}

export function ChartTypeSelector({
  chartType,
  onChartTypeChange,
  showCustomizer,
  onCustomizerToggle,
  className = ''
}: ChartTypeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`} data-chart-controls>
      {/* Chart Type Selector */}
      {showCustomizer && (
        <div className="flex gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border">
          <Button
            variant={chartType === 'circular' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChartTypeChange('circular')}
            className="p-1 h-8 w-8"
            title="Circular Chart"
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'bar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChartTypeChange('bar')}
            className="p-1 h-8 w-8"
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'pie' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChartTypeChange('pie')}
            className="p-1 h-8 w-8"
            title="Pie Chart"
          >
            <PieChart className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'line' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChartTypeChange('line')}
            className="p-1 h-8 w-8"
            title="Line Chart"
          >
            <TrendingUp className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Customizer Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCustomizerToggle(!showCustomizer)}
        className="p-1 h-8 w-8"
        title="Customize Chart"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  )
}
