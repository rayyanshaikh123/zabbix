"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building, MapPin, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Office {
  _id: string
  office: string
  city: string
  country: string
  geo: {
    lat: number
    lon: number
    source: string
  }
  device_count: number
  status: string
  contact_info: {
    person: string
    email: string
    phone: string
    address: string
  }
  health_score?: number
  health_status?: 'excellent' | 'good' | 'warning' | 'critical'
}

interface SimpleMapFallbackProps {
  offices: Office[]
  className?: string
}

export function SimpleMapFallback({ offices, className = '' }: SimpleMapFallbackProps) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'warning': return 'bg-orange-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return '✅'
      case 'good': return '🟢'
      case 'warning': return '⚠️'
      case 'critical': return '❌'
      default: return '❓'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Office Locations (Simple View)
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Excellent Health</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Good Health</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Critical</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
          <div className="text-center">
            <MapPin className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Interactive Map Unavailable</h3>
            <p className="text-muted-foreground">Using simplified office list view</p>
          </div>
        </div>
        
        {/* Office List */}
        <div>
          <h4 className="font-semibold mb-3">All Offices ({offices.length})</h4>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {Object.entries(offices.reduce((acc, office) => {
              if (!acc[office.country]) {
                acc[office.country] = []
              }
              acc[office.country].push(office)
              return acc
            }, {} as { [country: string]: Office[] })).map(([country, countryOffices]) => (
              <div key={country} className="space-y-1">
                <h5 className="text-sm font-medium text-muted-foreground">{country}</h5>
                {countryOffices.map((office) => (
                  <Link key={office._id} href={`/location/cities/offices/${office._id}`}>
                    <div className="flex items-center justify-between p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getHealthColor(office.health_status || 'critical')}`}></div>
                        <div>
                          <div className="text-sm font-medium">{office.office}</div>
                          <div className="text-xs text-muted-foreground">{office.city}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getHealthIcon(office.health_status || 'critical')}</span>
                          <div>
                            <div className="text-sm font-semibold">{office.health_score || 0}%</div>
                            <div className="text-xs text-muted-foreground">{office.device_count} devices</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
