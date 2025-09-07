'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'

interface DatabaseStats {
  metrics: number
  events: number
  devices: number
  dateRange: {
    oldest: string
    newest: string
  }
}

interface CleanupResult {
  success: boolean
  message: string
  stats: {
    before: { metrics: number; events: number }
    after: { metrics: number; events: number }
    deleted: { metrics: number; events: number }
  }
  config: {
    keepDays: number
    minRecordsPerDevice: number
    cutoffTime: string
  }
}

export default function AdminPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [keepDays, setKeepDays] = useState(7)
  const [minRecords, setMinRecords] = useState(100)
  const [dryRun, setDryRun] = useState(true)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/cleanup')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const runCleanup = async () => {
    setCleanupLoading(true)
    setCleanupResult(null)
    
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keepDays,
          minRecordsPerDevice: minRecords,
          dryRun,
        }),
      })
      
      const data = await response.json()
      setCleanupResult(data)
      
      if (data.success && !dryRun) {
        // Refresh stats after successful cleanup
        await fetchStats()
      }
    } catch (error) {
      console.error('Error running cleanup:', error)
    } finally {
      setCleanupLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8" />
          Database Administration
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage database cleanup and monitor storage usage
        </p>
      </div>

      {/* Database Stats */}
      {stats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Statistics
            </CardTitle>
            <CardDescription>
              Current database size and data distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(stats.metrics)}
                </div>
                <div className="text-sm text-muted-foreground">Metrics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(stats.events)}
                </div>
                <div className="text-sm text-muted-foreground">Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.devices}
                </div>
                <div className="text-sm text-muted-foreground">Devices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(stats.metrics + stats.events)}
                </div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Oldest Record:</span>
                  <div className="text-muted-foreground">
                    {formatDate(stats.dateRange.oldest)}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Newest Record:</span>
                  <div className="text-muted-foreground">
                    {formatDate(stats.dateRange.newest)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cleanup Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Database Cleanup
          </CardTitle>
          <CardDescription>
            Remove old data to prevent database size issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="keepDays">Keep Data For (Days)</Label>
              <Input
                id="keepDays"
                type="number"
                value={keepDays}
                onChange={(e) => setKeepDays(parseInt(e.target.value) || 7)}
                min="1"
                max="365"
              />
            </div>
            <div>
              <Label htmlFor="minRecords">Min Records Per Device</Label>
              <Input
                id="minRecords"
                type="number"
                value={minRecords}
                onChange={(e) => setMinRecords(parseInt(e.target.value) || 100)}
                min="1"
                max="10000"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="dryRun"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="dryRun">Dry Run (Preview only, don't delete)</Label>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={runCleanup}
              disabled={cleanupLoading}
              variant={dryRun ? "outline" : "destructive"}
            >
              {cleanupLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {dryRun ? 'Preview Cleanup' : 'Run Cleanup'}
            </Button>
            <Button
              onClick={fetchStats}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Results */}
      {cleanupResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {cleanupResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              Cleanup Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                {cleanupResult.message}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <h4 className="font-medium mb-2">Before Cleanup</h4>
                <div className="space-y-1 text-sm">
                  <div>Metrics: {formatNumber(cleanupResult.stats.before.metrics)}</div>
                  <div>Events: {formatNumber(cleanupResult.stats.before.events)}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">After Cleanup</h4>
                <div className="space-y-1 text-sm">
                  <div>Metrics: {formatNumber(cleanupResult.stats.after.metrics)}</div>
                  <div>Events: {formatNumber(cleanupResult.stats.after.events)}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Deleted</h4>
                <div className="space-y-1 text-sm">
                  <div className="text-red-600">
                    Metrics: {formatNumber(cleanupResult.stats.deleted.metrics)}
                  </div>
                  <div className="text-red-600">
                    Events: {formatNumber(cleanupResult.stats.deleted.events)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Configuration Used</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Keep Days:</span> {cleanupResult.config.keepDays}
                </div>
                <div>
                  <span className="font-medium">Min Records:</span> {cleanupResult.config.minRecordsPerDevice}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Cutoff Time:</span> {formatDate(cleanupResult.config.cutoffTime)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}