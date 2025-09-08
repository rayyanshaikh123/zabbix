"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  Shield, 
  Activity,
  Loader2,
  Bot,
  Wrench
} from 'lucide-react'

interface TroubleshootSolution {
  // Dynamic fields based on severity and issue type
  hasIssue?: boolean
  message?: string
  status?: string
  
  // Error/Critical level fields
  rootCause?: string
  immediateActions?: string[]
  troubleshootingSteps?: Array<{
    step: number
    action: string
    description: string
  }>
  recoveryProcedures?: string[]
  
  // Warning level fields
  potentialCause?: string
  investigationSteps?: Array<{
    step: number
    action: string
    description: string
  }>
  preventiveActions?: string[]
  
  // Info level fields
  statusExplanation?: string
  monitoringRecommendations?: string[]
  
  // Common fields
  severity: 'info' | 'warn' | 'error'
  estimatedImpact: string
  estimatedTimeToFix: string
}

interface AITroubleshootModalProps {
  device: string
  metric: string
  value: any
  suggestion: string
  severity: 'info' | 'warn' | 'error'
  children: React.ReactNode
}

export function AITroubleshootModal({ 
  device, 
  metric, 
  value, 
  suggestion, 
  severity, 
  children 
}: AITroubleshootModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [solution, setSolution] = useState<TroubleshootSolution | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAISolution = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai-troubleshoot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device,
          metric,
          value,
          suggestion,
          severity
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSolution(data.solution)
      } else {
        setError(data.error || 'Failed to get AI solution')
      }
    } catch (err) {
      setError('Network error while fetching AI solution')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !solution && !loading) {
      fetchAISolution()
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'warn': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-orange-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[95vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI-Powered Troubleshooting
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-4">
          <div className="space-y-6">
            {/* Alert Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Alert Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Device</p>
                      <p className="font-medium text-base">{device}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Value</p>
                      <p className="font-medium text-base">{value}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Metric</p>
                    <p className="font-medium font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded border break-all">
                      {metric}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Severity</p>
                    <Badge className={`${getSeverityColor(severity)} text-sm px-3 py-1`}>
                      {severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Automated Suggestion</p>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded border-l-4 border-amber-400">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                        {suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Solution */}
            {loading && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-muted-foreground">AI is analyzing the issue...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                    <p className="text-red-600 mb-2">Failed to get AI solution</p>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <Button onClick={fetchAISolution} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {solution && (
              <>
                {/* No Issue Detected */}
                {solution.hasIssue === false && (
                  <Card>
                    <CardContent className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
                          No Issues Detected
                        </h3>
                        <p className="text-green-600 dark:text-green-400 mb-4">
                          {solution.message}
                        </p>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {solution.status?.toUpperCase() || 'HEALTHY'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Issue Analysis - Only show if there's an actual issue */}
                {solution.hasIssue !== false && (
                  <>
                    {/* Root Cause Analysis - Only for errors/critical */}
                    {solution.rootCause && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-red-500" />
                            Root Cause Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border-l-4 border-red-400">
                            <p className="text-sm leading-relaxed text-red-800 dark:text-red-200">
                              {solution.rootCause}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Potential Cause - Only for warnings */}
                    {solution.potentialCause && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Potential Cause
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded border-l-4 border-orange-400">
                            <p className="text-sm leading-relaxed text-orange-800 dark:text-orange-200">
                              {solution.potentialCause}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Status Explanation - Only for info */}
                    {solution.statusExplanation && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                            Status Explanation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border-l-4 border-blue-400">
                            <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                              {solution.statusExplanation}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Impact & Time Estimates - Only if there's an issue */}
                    {solution.hasIssue !== false && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Impact Assessment
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                              <p className="text-sm text-muted-foreground mb-1">Estimated Impact</p>
                              <p className={`font-semibold text-lg ${getImpactColor(solution.estimatedImpact)}`}>
                                {solution.estimatedImpact}
                              </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                              <p className="text-sm text-muted-foreground mb-1">Time to Fix</p>
                              <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                                {solution.estimatedTimeToFix}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Immediate Actions - Only for errors/critical */}
                    {solution.immediateActions && solution.immediateActions.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Immediate Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border-l-4 border-yellow-400">
                            <ul className="space-y-3">
                              {solution.immediateActions.map((action, index) => (
                                <li key={index} className="flex items-start gap-3">
                                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                                    {action}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Investigation Steps - Only for warnings */}
                    {solution.investigationSteps && solution.investigationSteps.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-orange-500" />
                            Investigation Steps
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {solution.investigationSteps.map((step) => (
                              <div key={step.step} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                                <div className="flex items-start gap-4">
                                  <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {step.step}
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded border mb-3">
                                      <p className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                                        {step.action}
                                      </p>
                                    </div>
                                    <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                                      {step.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Troubleshooting Steps - Only for errors/critical */}
                    {solution.troubleshootingSteps && solution.troubleshootingSteps.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-purple-500" />
                            Troubleshooting Steps
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {solution.troubleshootingSteps.map((step) => (
                              <div key={step.step} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                <div className="flex items-start gap-4">
                                  <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {step.step}
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded border mb-3">
                                      <p className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                                        {step.action}
                                      </p>
                                    </div>
                                    <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
                                      {step.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recovery Procedures - Only for errors/critical */}
                    {solution.recoveryProcedures && solution.recoveryProcedures.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5 text-red-500" />
                            Recovery Procedures
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border-l-4 border-red-400">
                            <ul className="space-y-3">
                              {solution.recoveryProcedures.map((procedure, index) => (
                                <li key={index} className="flex items-start gap-3">
                                  <Zap className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
                                    {procedure}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Preventive Actions - Only for warnings */}
                    {solution.preventiveActions && solution.preventiveActions.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-orange-500" />
                            Preventive Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded border-l-4 border-orange-400">
                            <ul className="space-y-3">
                              {solution.preventiveActions.map((action, index) => (
                                <li key={index} className="flex items-start gap-3">
                                  <Shield className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                                    {action}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Monitoring Recommendations - Only for info */}
                    {solution.monitoringRecommendations && solution.monitoringRecommendations.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Monitoring Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border-l-4 border-blue-400">
                            <ul className="space-y-3">
                              {solution.monitoringRecommendations.map((recommendation, index) => (
                                <li key={index} className="flex items-start gap-3">
                                  <Activity className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                    {recommendation}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
