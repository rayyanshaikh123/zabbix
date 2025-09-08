"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building, Users, Activity, ArrowRight, CheckCircle, AlertTriangle, MapPin } from 'lucide-react'
import Link from 'next/link'
import { SimpleMapFallback } from '@/components/simple-map-fallback'
import 'leaflet/dist/leaflet.css'

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

interface LeafletMapProps {
  offices: Office[]
  className?: string
}

export function LeafletMap({ offices, className = '' }: LeafletMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const isInitializedRef = useRef(false)
  const mapKeyRef = useRef(0)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize map with proper error handling
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || isInitializedRef.current) {
      return
    }

    // Prevent multiple initializations
    if (mapInstanceRef.current) {
      return
    }

    const initializeMap = async () => {
      try {
        // Dynamic import of Leaflet only
        const L = await import('leaflet')
        
        // Fix Leaflet icons
        if (typeof window !== 'undefined') {
          delete (L.Icon.Default.prototype as any)._getIconUrl
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          })
        }

        // Ensure container is ready
        if (!mapContainerRef.current) {
          throw new Error('Map container not ready')
        }

        // Create map instance with error handling
        const map = L.map(mapContainerRef.current, {
          center: [offices[0]?.geo.lat || 20.5937, offices[0]?.geo.lon || 78.9629],
          zoom: 6,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          dragging: true,
          keyboard: true,
          touchZoom: true
        })

        // Verify map was created successfully
        if (!map || !map.getContainer) {
          throw new Error('Failed to create map instance')
        }

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)

        // Add markers
        if (offices && offices.length > 0) {
          offices.forEach(office => {
            if (office.geo && office.geo.lat && office.geo.lon) {
              const marker = L.marker([office.geo.lat, office.geo.lon], {
                icon: createCustomIcon(L, getMarkerColor(office))
              }).addTo(map)

          // Get health color and status
          const getHealthColor = (status: string) => {
            switch (status) {
              case 'excellent': return '#10B981'
              case 'good': return '#3B82F6'
              case 'warning': return '#F59E0B'
              case 'critical': return '#EF4444'
              default: return '#6B7280'
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
          
          const healthScore = office.health_score || 0
          const healthStatus = office.health_status || 'critical'
          const healthColor = getHealthColor(healthStatus)
          const healthIcon = getHealthIcon(healthStatus)
          
          marker.bindPopup(`
            <div style="min-width: 280px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="font-weight: 600; font-size: 18px; margin: 0;">${office.office}</h3>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; ${office.status === 'active' ? 'background-color: #10B981; color: white;' : 'background-color: #EF4444; color: white;'}">${office.status}</span>
              </div>
              
              <!-- Health Status Section -->
              <div style="background-color: #F9FAFB; padding: 8px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid ${healthColor};">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-size: 16px;">${healthIcon}</span>
                  <span style="font-weight: 600; color: ${healthColor};">Health: ${healthScore}%</span>
                </div>
                <div style="font-size: 12px; color: #6B7280; text-transform: capitalize;">${healthStatus} Status</div>
              </div>
              
              <!-- Office Details -->
              <div style="margin-bottom: 12px;">
                <div style="margin-bottom: 6px; font-size: 14px;"><strong>📍 Location:</strong> ${office.city}, ${office.country}</div>
                <div style="margin-bottom: 6px; font-size: 14px;"><strong>🖥️ Devices:</strong> ${office.device_count}</div>
                <div style="margin-bottom: 6px; font-size: 14px;"><strong>👤 Contact:</strong> ${office.contact_info.person}</div>
              </div>
              
              <a href="/location/cities/offices/${office._id}" style="display: inline-block; padding: 10px 16px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; width: 100%; text-align: center; font-weight: 500;">View Details</a>
            </div>
          `)
            }
          })
        }

        // Fit bounds to show all markers
        if (offices.length > 0) {
          const group = new L.featureGroup(offices.map(office => 
            L.marker([office.geo.lat, office.geo.lon])
          ))
          map.fitBounds(group.getBounds().pad(0.1))
        }

        // Store map reference first
        mapInstanceRef.current = map
        
        // Invalidate map size to ensure proper rendering with delay
        setTimeout(() => {
          if (mapInstanceRef.current && typeof mapInstanceRef.current.invalidateSize === 'function') {
            try {
              mapInstanceRef.current.invalidateSize()
            } catch (error) {
              console.warn('Error invalidating map size on init:', error)
            }
          }
        }, 200)

        // Add resize observer to handle container size changes
        const resizeObserver = new ResizeObserver(() => {
          // Add a small delay to prevent rapid calls
          setTimeout(() => {
            if (mapInstanceRef.current && typeof mapInstanceRef.current.invalidateSize === 'function') {
              try {
                mapInstanceRef.current.invalidateSize()
              } catch (error) {
                console.warn('Error invalidating map size on resize:', error)
              }
            }
          }, 50)
        })
        
        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current)
        }

        setIsMapReady(true)
        isInitializedRef.current = true
        
        // Store resize observer for cleanup
        ;(mapInstanceRef.current as any).resizeObserver = resizeObserver

      } catch (error) {
        console.error('Map initialization error:', error)
        setMapError(true)
      }
    }

    initializeMap()

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          // Clean up resize observer if it exists
          if ((mapInstanceRef.current as any).resizeObserver) {
            (mapInstanceRef.current as any).resizeObserver.disconnect()
          }
          // Remove the map
          if (typeof mapInstanceRef.current.remove === 'function') {
            mapInstanceRef.current.remove()
          }
        } catch (error) {
          console.warn('Error cleaning up map:', error)
        }
        mapInstanceRef.current = null
        isInitializedRef.current = false
        setIsMapReady(false)
      }
    }
  }, [isClient, offices])

  const getMarkerColor = (office: Office) => {
    // If we have health data, use health status for color
    if (office.health_status && office.health_score !== undefined) {
      switch (office.health_status) {
        case 'excellent': return '#10B981' // Green
        case 'good': return '#3B82F6' // Blue
        case 'warning': return '#F59E0B' // Orange
        case 'critical': return '#EF4444' // Red
        default: return '#6B7280' // Gray
      }
    }
    
    // Fallback to original logic if no health data
    if (office.status === 'active' && office.device_count > 0) {
      return '#10B981' // Green for active with devices
    } else if (office.status === 'active') {
      return '#3B82F6' // Blue for active without devices
    } else {
      return '#EF4444' // Red for inactive
    }
  }

  const createCustomIcon = (L: any, color: string) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            color: white;
            font-size: 10px;
            font-weight: bold;
          ">🏢</div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>
    }
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Inactive</Badge>
  }

  // Don't render anything until we're on the client
  if (!isClient) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Office Locations Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (mapError) {
    return <SimpleMapFallback offices={offices} className={className} />
  }

  if (offices.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Office Locations Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Offices Found</h3>
              <p className="text-muted-foreground">No offices with location data available.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Office Locations Map
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
        <div 
          ref={mapContainerRef}
          className="h-96 w-full rounded-lg border"
          style={{ 
            height: '384px', 
            width: '100%',
            minHeight: '384px',
            position: 'relative',
            zIndex: 1
          }}
          key={mapKeyRef.current}
        />
        
        {/* Office List */}
        <div className="mt-4">
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
                    <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getMarkerColor(office) }}
                        ></div>
                        <div>
                          <div className="text-sm font-medium">{office.office}</div>
                          <div className="text-xs text-muted-foreground">{office.city}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{office.device_count}</div>
                        <div className="text-xs text-muted-foreground">devices</div>
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