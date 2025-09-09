"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  Wrench,
  Target,
  Timer,
  TrendingUp,
  List,
} from "lucide-react"

// Updated interface to match API response
interface TroubleshootSolution {
  rootCause: string
  immediateActions: string[]
  preventiveActions: string[]
  severity: string
  estimatedImpact: string
  estimatedTimeToFix: string
  hasIssue: boolean
  summary?: string // Added optional summary field
}

interface AITroubleshootModalProps {
  device: string
  metric: string
  value: any
  suggestion: string
  severity: "info" | "warn" | "error"
  mode: "analysis" | "troubleshoot"
}

export function AITroubleshootModal({
  device,
  metric,
  value,
  suggestion,
  severity,
  mode,
}: AITroubleshootModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [solution, setSolution] = useState<TroubleshootSolution | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTroubleshooting, setIsTroubleshooting] = useState(false)
  // Track last action for retry
  const [lastAction, setLastAction] = useState<"analysis" | "troubleshoot">("analysis")

  // Unified fetch for analysis
  const fetchAnalysis = async () => {
    setLastAction("analysis")
    setLoading(true)
    setError(null)
    setSolution(null)
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device, metric, value, severity, mode: "analysis" }),
      })
      const data = await response.json()
      if (response.ok) {
        setSolution(data)
      } else {
        setError(data.error || "Failed to get AI analysis")
      }
    } catch (err) {
      setError("Network error while fetching AI analysis")
    } finally {
      setLoading(false)
    }
  }

  // Unified fetch for troubleshooting
  const fetchTroubleshoot = async () => {
    setLastAction("troubleshoot")
    setIsTroubleshooting(true)
    setError(null)
    setSolution(null)
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device, metric, value, severity, suggestion, mode: "troubleshoot" }),
      })
      const data = await response.json()
      if (response.ok) {
        setSolution(data)
      } else {
        setError(data.error || "Failed to get troubleshooting info")
      }
    } catch (err) {
      setError("Network error while fetching troubleshooting info")
    } finally {
      setIsTroubleshooting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    setSolution(null)
    setError(null)
    setLoading(false)
    setIsTroubleshooting(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200"
      case "error":
      case "high":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300"
      case "warn":
      case "warning":
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300"
      case "info":
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case "critical":
        return "text-red-700 font-semibold"
      case "high":
        return "text-red-600 font-medium"
      case "medium":
        return "text-orange-600 font-medium"
      case "low":
        return "text-green-600 font-medium"
      default:
        return "text-gray-600"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "error":
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "warn":
      case "warning":
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "info":
      case "low":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-blue-50">
          <Bot className="h-4 w-4 mr-2" />
        
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-6 w-6 text-blue-600 " />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI-Powered Analysis</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Intelligent troubleshooting and recommendations
              </p>
            </div>
            {/* Analysis and Troubleshoot Buttons */}
            <div className="flex gap-2 ml-6">
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-blue-50"
                onClick={fetchAnalysis}
                disabled={loading}
              >
                <Bot className="h-4 w-4 mr-2" />
                Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-yellow-50 border-yellow-400 text-yellow-700"
                onClick={fetchTroubleshoot}
                disabled={isTroubleshooting}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Troubleshoot
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-4">
          <div className="space-y-6">
            {/* Alert Summary Card */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Issue Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Device</p>
                      <p className="text-base font-semibold">{device}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Value</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {value}
                        </span>
                        {getSeverityIcon(severity)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Metric</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                        {metric}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Severity Level</p>
                      <Badge className={`${getSeverityColor(severity)} text-sm px-3 py-1 font-medium`}>
                        {severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Initial Assessment
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                        {suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Analyzing Issue...
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Our AI is examining the problem and generating recommendations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-red-200">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="text-center space-y-4">
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-red-700 dark:text-red-400">
                        Analysis Failed
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        {error}
                      </p>
                    </div>
                    <Button
                      onClick={lastAction === "analysis" ? fetchAnalysis : fetchTroubleshoot}
                      variant="outline"
                      className="mt-4 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Solution Results */}
            {solution && solution.hasIssue && (
              <div className="space-y-6">
                {/* Root Cause Analysis */}
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <Activity className="h-5 w-5" />
                      Root Cause Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                      {solution.rootCause}
                    </p>
                  </CardContent>
                </Card>

                {/* Impact Assessment */}
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                      <TrendingUp className="h-5 w-5" />
                      Impact Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded">
                          <Target className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Impact Level</p>
                          <p className={`text-lg font-semibold ${getImpactColor(solution.estimatedImpact)}`}>
                            {solution.estimatedImpact}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                          <Timer className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Time to Fix</p>
                          <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                            {solution.estimatedTimeToFix}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Immediate Actions */}
                {solution.immediateActions && solution.immediateActions.length > 0 && (
                  <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <Zap className="h-5 w-5" />
                        Immediate Actions Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {solution.immediateActions.map((action, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <p className="text-sm leading-relaxed text-yellow-800 dark:text-yellow-200">
                              {action}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preventive Actions */}
                {solution.preventiveActions && solution.preventiveActions.length > 0 && (
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Shield className="h-5 w-5" />
                        Preventive Measures
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {solution.preventiveActions.map((action, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex-shrink-0">
                              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                            </div>
                            <p className="text-sm leading-relaxed text-green-800 dark:text-green-200">
                              {action}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Summary Section */}
            {solution && solution.summary && (
              <Card className="border-l-4 border-l-green-400">
                <CardContent className="py-6 flex flex-col items-center justify-center">
                  <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">Summary</h3>
                  <p className="text-base text-green-700 dark:text-green-300 text-center">{solution.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* No Issues State */}
            {solution && !solution.hasIssue && (
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
                        All Systems Normal
                      </h3>
                      <p className="text-green-600 dark:text-green-500 mt-2">
                        No critical issues detected with the current metrics
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-sm px-4 py-1">
                      HEALTHY STATUS
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}