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
  const LRef = useRef<any>(null)
  const [deviceCounts, setDeviceCounts] = useState<{ [officeId: string]: number }>({})
  const [officeHealth, setOfficeHealth] = useState<{ [officeId: string]: { score: number; status: 'excellent' | 'good' | 'warning' | 'critical' } }>({})
  const markersRef = useRef<{ [officeId: string]: any }>({})

  const buildPopupHtml = (office: Office, count: number) => {
    const computed = officeHealth[office._id]
    const healthScore = computed?.score ?? office.health_score ?? 0
    const healthStatus = computed?.status ?? office.health_status ?? 'critical'
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
    const healthColor = getHealthColor(healthStatus)
    const healthIcon = getHealthIcon(healthStatus)
    return `
      <div style="min-width: 280px; padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-weight: 600; font-size: 18px; margin: 0;">${office.office}</h3>
          <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; ${office.status === 'active' ? 'background-color: #10B981; color: white;' : 'background-color: #EF4444; color: white;'}">${office.status}</span>
        </div>
        <div style="background-color: #F9FAFB; padding: 8px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid ${healthColor};">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 16px;">${healthIcon}</span>
            <span style="font-weight: 600; color: ${healthColor};">Health: ${healthScore}%</span>
          </div>
          <div style="font-size: 12px; color: #6B7280; text-transform: capitalize;">${healthStatus} Status</div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="margin-bottom: 6px; font-size: 14px;"><strong>📍 Location:</strong> ${office.city}, ${office.country}</div>
          <div style="margin-bottom: 6px; font-size: 14px;"><strong>🖥️ Devices:</strong> ${count}</div>
          <div style="margin-bottom: 6px; font-size: 14px;"><strong>👤 Contact:</strong> ${office.contact_info.person}</div>
        </div>
        <a href="/location/cities/offices/${office._id}" style="display: inline-block; padding: 10px 16px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; width: 100%; text-align: center; font-weight: 500;">View Details</a>
      </div>
    `
  }

  // Compute live device counts for the office list and expose to popup template
  useEffect(() => {
    const normalize = (val?: string) => (val || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')
    const belongsToOffice = (device: any, office: any): boolean => {
      if (!device || !office) return false
      const deviceLoc = normalize(device.location)
      const candidates = [office.office, office._id, `${office.city}-${office.office}`, `${office.country}-${office.city}-${office.office}`]
        .filter(Boolean).map(normalize)
      const idMatch = Array.isArray(office.device_ids) && office.device_ids.some((x: any) => {
        const n = normalize(typeof x === 'object' ? (x.hostid || x.device_id || x) : x)
        const hostCandidates = [device.hostid, device.device_id, device.name].filter(Boolean).map(normalize)
        return hostCandidates.includes(n)
      })
      return idMatch || candidates.some((c: string) => deviceLoc === c || deviceLoc.includes(c))
    }

    const load = async () => {
      try {
        const res = await fetch('/api/hosts/all')
        if (!res.ok) return
        const data = await res.json()
        const counts: { [officeId: string]: number } = {}
        const health: { [officeId: string]: { score: number; status: 'excellent' | 'good' | 'warning' | 'critical' } } = {}
        offices.forEach((office) => {
          const ods = (data.hosts || []).filter((h: any) => belongsToOffice(h, office))
          counts[office._id] = ods.length
          if (ods.length > 0) {
            const sev = (s: any) => (s || '').toString().toLowerCase()
            const stat = (s: any) => (s || '').toString().toLowerCase()
            const healthy = ods.filter((d: any) => sev(d.severity) === 'info' || sev(d.severity) === 'healthy' || stat(d.status) === 'operational' || stat(d.status) === 'up').length
            const warning = ods.filter((d: any) => sev(d.severity) === 'warning').length
            const critical = ods.filter((d: any) => sev(d.severity) === 'critical' || sev(d.severity) === 'error' || stat(d.status) === 'down' || stat(d.status) === 'offline').length
            // If we have devices and none are warning/critical, treat as 100% healthy even if labels are missing
            const scoreRaw = (warning === 0 && critical === 0) ? 100 : ((healthy * 100) + (warning * 60) + (critical * 20)) / ods.length
            const score = Math.round(scoreRaw)
            let status: 'excellent' | 'good' | 'warning' | 'critical'
            if (critical === 0 && healthy > 0 && warning === 0) status = 'excellent'
            else if (score >= 85) status = 'good'
            else if (score >= 60) status = 'warning'
            else status = 'critical'
            health[office._id] = { score, status }
          } else {
            health[office._id] = { score: 0, status: 'critical' }
          }
        })
        setDeviceCounts(counts)
        setOfficeHealth(health)
        if (typeof window !== 'undefined') {
          ;(window as any).__officeDeviceCounts = counts
          // Update any open popups with the latest counts
          Object.entries(markersRef.current).forEach(([officeId, marker]) => {
            const office = (offices || []).find(o => o._id === officeId)
            if (office && marker && typeof marker.setPopupContent === 'function') {
              try {
                marker.setPopupContent(buildPopupHtml(office as any, counts[officeId] ?? (office as any).device_count ?? 0))
              } catch {}
            }
          })
        }
      } catch {
        // ignore
      }
    }

    if (offices.length > 0) load()
  }, [offices])

  // When live counts/health are ready or markers mount, refresh popup contents
  useEffect(() => {
    if (!markersRef.current) return
    Object.entries(markersRef.current).forEach(([officeId, marker]) => {
      const office = (offices || []).find(o => o._id === officeId)
      if (!office || !marker || typeof marker.setPopupContent !== 'function') return
      try {
        const count = deviceCounts[officeId] ?? (office as any).device_count ?? 0
        marker.setPopupContent(buildPopupHtml(office as any, count))
      } catch {}
    })
  }, [deviceCounts, officeHealth, offices])

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
        LRef.current = L
        
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
              markersRef.current[office._id] = marker

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
          
          marker.bindPopup(buildPopupHtml(office, (typeof window !== 'undefined' && (window as any).__officeDeviceCounts && (window as any).__officeDeviceCounts[office._id] !== undefined) ? (window as any).__officeDeviceCounts[office._id] : (office.device_count ?? 0)))
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

  const getMarkerColor = (office: any) => {
    // Prefer computed live health if available
    const computed = office && office._id ? officeHealth[office._id] : undefined
    if (computed && computed.status) {
      switch (computed.status) {
        case 'excellent': return '#10B981'
        case 'good': return '#3B82F6'
        case 'warning': return '#F59E0B'
        case 'critical': return '#EF4444'
        default: return '#6B7280'
      }
    }
    // Next, use any health on the office object itself
    if (office.health_status && office.health_score !== undefined) {
      switch (office.health_status) {
        case 'excellent': return '#10B981'
        case 'good': return '#3B82F6'
        case 'warning': return '#F59E0B'
        case 'critical': return '#EF4444'
        default: return '#6B7280'
      }
    }
    // Fallback to status + live deviceCounts if available
    const devices = (office && office._id && deviceCounts[office._id] !== undefined)
      ? deviceCounts[office._id]
      : office.device_count
    if (office.status === 'active' && (devices || 0) > 0) return '#10B981'
    if (office.status === 'active') return '#3B82F6'
    return '#EF4444'
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
      <div className={`glass-panel p-4 md:p-5 ${className}`}>
        <div className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <MapPin className="h-5 w-5 text-blue-400" />
            Office Locations Map
          </div>
        </div>
        <div className="p-4 pt-0">
          <div className="h-96 w-full flex items-center justify-center rounded-lg bg-white/5 border border-white/10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p className="text-sm text-slate-300">Loading map...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (mapError) {
    return <SimpleMapFallback offices={offices} className={className} />
  }

  if (offices.length === 0) {
    return (
      <div className={`glass-panel ${className}`}>
        <div className="p-4 md:p-5 ">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <MapPin className="h-5 w-5 text-blue-400" />
            Office Locations Map
          </div>
        </div>
        <div className="p-4 pt-0">
          <div className="h-96 w-full flex items-center justify-center rounded-lg bg-white/5 border border-white/10">
            <div className="text-center">
              <Building className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-slate-100">No Offices Found</h3>
              <p className="text-slate-300">No offices with location data available.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-panel h-[39vh] `}>
      <div className="p-4 pb-[300px] md:p-5">
        <div className="flex items-center  gap-2 text-slate-200 font-semibold">
          <MapPin className="h-5 w-5 text-blue-400" />
          Office Locations Map
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span>Excellent Health</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span>Good Health</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span>Critical</span>
          </div>
        </div>
      </div>
      <div className="p-4 pt-0">
        <div 
          ref={mapContainerRef}
          className="h-96 w-full rounded-lg border border-white/10 overflow-hidden"
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
        <div className="mt-[65px]">
          <h4 className="font-semibold mb-3 text-slate-200">All Offices ({offices.length})</h4>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {Object.entries(offices.reduce((acc, office) => {
              if (!acc[office.country]) {
                acc[office.country] = []
              }
              acc[office.country].push(office)
              return acc
            }, {} as { [country: string]: Office[] })).map(([country, countryOffices]) => (
              <div key={country} className="space-y-1">
                <h5 className="text-sm font-medium text-slate-300">{country}</h5>
                {countryOffices.map((office) => (
                  <Link key={office._id} href={`/location/cities/offices/${office._id}`}>
                    <div className="flex items-center justify-between p-2 rounded glass-hover bg-white/5 border border-white/10 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getMarkerColor(office) }}
                        ></div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">{office.office}</div>
                          <div className="text-xs text-slate-400">{office.city}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-200">{deviceCounts[office._id] ?? office.device_count ?? 0}</div>
                        <div className="text-xs text-slate-400">devices</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}