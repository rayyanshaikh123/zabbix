"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building, Users, Activity, ArrowRight, CheckCircle, AlertTriangle, MapPin } from 'lucide-react'
import Link from 'next/link'
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

    const initializeMap = async () => {
      try {
        // Dynamic import of Leaflet
        const L = await import('leaflet')
        const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet')
        
        // Fix Leaflet icons
        if (typeof window !== 'undefined') {
          delete (L.Icon.Default.prototype as any)._getIconUrl
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          })
        }

        // Create map instance
        const map = L.map(mapContainerRef.current!, {
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

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)

        // Add markers
        offices.forEach(office => {
          const marker = L.marker([office.geo.lat, office.geo.lon], {
            icon: createCustomIcon(L, getMarkerColor(office))
          }).addTo(map)

          marker.bindPopup(`
            <div style="min-width: 250px; padding: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="font-weight: 600; font-size: 18px; margin: 0;">${office.office}</h3>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; ${office.status === 'active' ? 'background-color: #10B981; color: white;' : 'background-color: #EF4444; color: white;'}">${office.status}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <div style="margin-bottom: 4px;"><strong>Location:</strong> ${office.city}, ${office.country}</div>
                <div style="margin-bottom: 4px;"><strong>Devices:</strong> ${office.device_count}</div>
                <div style="margin-bottom: 4px;"><strong>Contact:</strong> ${office.contact_info.person}</div>
              </div>
              <a href="/location/cities/offices/${office._id}" style="display: inline-block; padding: 8px 16px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; width: 100%; text-align: center;">View Details</a>
            </div>
          `)
        })

        // Fit bounds to show all markers
        if (offices.length > 0) {
          const group = new L.featureGroup(offices.map(office => 
            L.marker([office.geo.lat, office.geo.lon])
          ))
          map.fitBounds(group.getBounds().pad(0.1))
        }

        // Invalidate map size to ensure proper rendering
        setTimeout(() => {
          map.invalidateSize()
        }, 100)

        // Add resize observer to handle container size changes
        const resizeObserver = new ResizeObserver(() => {
          if (map) {
            map.invalidateSize()
          }
        })
        
        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current)
        }

        mapInstanceRef.current = map
        setIsMapReady(true)
        isInitializedRef.current = true

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
          mapInstanceRef.current.remove()
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
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Map Loading Error</h3>
              <p className="text-muted-foreground mb-4">Unable to load the interactive map.</p>
              <Button onClick={() => {
                setMapError(false)
                isInitializedRef.current = false
                mapKeyRef.current += 1
              }} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
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
            <span>Active with devices</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Active without devices</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Inactive</span>
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