"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet"
import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { COUNTRY_COORDINATES, CITY_COORDINATES, OFFICE_COORDINATES_OFFSET } from "@/lib/location-utils"

type Metrics = { 
  Healthy: number; 
  Warning: number; 
  Critical: number;
}

export type LocationData = {
  level: 'country' | 'city' | 'office';
  name: string;
  slug: string;
  metrics: Metrics;
  deviceCount: number;
  children?: LocationData[];
  position?: [number, number];
  bounds?: [[number, number], [number, number]];
}

// Component to handle map view changes
function MapViewController({ level, bounds, center }: { 
  level: 'world' | 'country' | 'city';
  bounds?: [[number, number], [number, number]];
  center?: [number, number];
}) {
  const map = useMap()
  
  useEffect(() => {
    if (level === 'world') {
      map.setView([20.5937, 78.9629], 3)
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (center) {
      const zoom = level === 'country' ? 5 : 11;
      map.setView(center, zoom)
    }
  }, [level, bounds, center, map])
  
  return null
}

// Get health color based on metrics
function getHealthColor(metrics: Metrics): string {
  const total = metrics.Healthy + metrics.Warning + metrics.Critical || 1
  const criticalPercent = (metrics.Critical / total) * 100
  const warningPercent = (metrics.Warning / total) * 100
  
  if (criticalPercent > 20) return "#dc2626" // red-600
  if (warningPercent > 30) return "#f59e0b" // amber-500
  return "#10b981" // emerald-500
}

// Calculate percentage
function pct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function HierarchicalLocationMap({
  locations,
  className = "",
}: {
  locations: LocationData[];
  className?: string;
}) {
  const router = useRouter()
  const [viewLevel, setViewLevel] = useState<'world' | 'country' | 'city'>('world')
  const [selectedCountry, setSelectedCountry] = useState<LocationData | null>(null)
  const [selectedCity, setSelectedCity] = useState<LocationData | null>(null)

  // Get coordinates for a location
  const getLocationCoordinates = useCallback((location: LocationData): [number, number] | null => {
    const nameLower = location.name.toLowerCase()
    
    if (location.level === 'country') {
      const countryData = COUNTRY_COORDINATES[location.name]
      return countryData?.center || null
    } else if (location.level === 'city') {
      return CITY_COORDINATES[nameLower] || null
    } else if (location.level === 'office' && selectedCity) {
      const cityCoords = CITY_COORDINATES[selectedCity.name.toLowerCase()]
      if (cityCoords) {
        const offset = OFFICE_COORDINATES_OFFSET[nameLower] || OFFICE_COORDINATES_OFFSET['main office']
        return [
          cityCoords[0] + offset[0],
          cityCoords[1] + offset[1]
        ]
      }
    }
    
    return null
  }, [selectedCity])

  // Get bounds for a country
  const getCountryBounds = useCallback((countryName: string): [[number, number], [number, number]] | null => {
    const countryData = COUNTRY_COORDINATES[countryName]
    return countryData?.bounds || null
  }, [])

  // Handle country click
  const handleCountryClick = useCallback((country: LocationData) => {
    setSelectedCountry(country)
    setViewLevel('country')
    router.push(`/locations/${country.slug}`)
  }, [router])

  // Handle city click
  const handleCityClick = useCallback((city: LocationData) => {
    if (selectedCountry) {
      setSelectedCity(city)
      setViewLevel('city')
      router.push(`/locations/${selectedCountry.slug}/${city.slug}`)
    }
  }, [selectedCountry, router])

  // Handle office click
  const handleOfficeClick = useCallback((office: LocationData) => {
    if (selectedCountry && selectedCity) {
      router.push(`/locations/${selectedCountry.slug}/${selectedCity.slug}/${office.slug}`)
    }
  }, [selectedCountry, selectedCity, router])

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (viewLevel === 'city') {
      setSelectedCity(null)
      setViewLevel('country')
    } else if (viewLevel === 'country') {
      setSelectedCountry(null)
      setViewLevel('world')
    }
  }, [viewLevel])

  // Get current locations to display based on view level
  const currentLocations = useMemo(() => {
    if (viewLevel === 'world') {
      return locations
    } else if (viewLevel === 'country' && selectedCountry) {
      return selectedCountry.children || []
    } else if (viewLevel === 'city' && selectedCity) {
      return selectedCity.children || []
    }
    return []
  }, [viewLevel, locations, selectedCountry, selectedCity])

  // Map click handler component
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        // Optional: handle map background clicks
      }
    })
    return null
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border bg-background ${className}`}>
      {/* Navigation breadcrumb */}
      {viewLevel !== 'world' && (
        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
          <button
            onClick={handleBack}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to {viewLevel === 'city' ? selectedCountry?.name : 'World'}
          </button>
        </div>
      )}

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={3}
        className="h-[600px] w-full"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapViewController 
          level={viewLevel}
          bounds={selectedCountry ? getCountryBounds(selectedCountry.name) : undefined}
          center={selectedCity ? getLocationCoordinates(selectedCity) : undefined}
        />
        
        <MapClickHandler />

        {/* Render countries as polygons when in world view */}
        {viewLevel === 'world' && locations.map((country) => {
          const bounds = getCountryBounds(country.name)
          const center = getLocationCoordinates(country)
          
          if (!bounds || !center) return null
          
          const color = getHealthColor(country.metrics)
          
          return (
            <Polygon
              key={country.slug}
              positions={[
                bounds[0],
                [bounds[0][0], bounds[1][1]],
                bounds[1],
                [bounds[1][0], bounds[0][1]]
              ]}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 2
              }}
              eventHandlers={{
                click: () => handleCountryClick(country),
                mouseover: (e) => {
                  e.target.setStyle({ fillOpacity: 0.5 })
                },
                mouseout: (e) => {
                  e.target.setStyle({ fillOpacity: 0.3 })
                }
              }}
            >
              <Popup>
                <CountryPopup location={country} />
              </Popup>
            </Polygon>
          )
        })}

        {/* Render cities/offices as circles */}
        {(viewLevel === 'country' || viewLevel === 'city') && currentLocations.map((location) => {
          const position = getLocationCoordinates(location)
          if (!position) return null
          
          const color = getHealthColor(location.metrics)
          const radius = location.level === 'city' ? 15 : 10
          
          return (
            <CircleMarker
              key={location.slug}
              center={position}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2
              }}
              eventHandlers={{
                click: () => {
                  if (location.level === 'city') {
                    handleCityClick(location)
                  } else if (location.level === 'office') {
                    handleOfficeClick(location)
                  }
                }
              }}
            >
              <Popup>
                <LocationPopup location={location} />
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

// Popup component for countries
function CountryPopup({ location }: { location: LocationData }) {
  const total = location.metrics.Healthy + location.metrics.Warning + location.metrics.Critical || 1
  const H = pct((location.metrics.Healthy / total) * 100)
  const W = pct((location.metrics.Warning / total) * 100)
  const C = pct((location.metrics.Critical / total) * 100)
  
  return (
    <div className="w-64 p-2">
      <div className="mb-2">
        <h3 className="text-lg font-semibold">{location.name}</h3>
        <p className="text-sm text-gray-600">
          {location.deviceCount} devices • {location.children?.length || 0} cities
        </p>
      </div>
      
      {/* Health bar */}
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded">
        <div style={{ width: `${H}%`, background: "#10b981" }} aria-label="Healthy" />
        <div style={{ width: `${W}%`, background: "#f59e0b" }} aria-label="Warning" />
        <div style={{ width: `${C}%`, background: "#dc2626" }} aria-label="Critical" />
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle bg-emerald-500" />
          Healthy {H}%
        </div>
        <div>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle bg-amber-500" />
          Warning {W}%
        </div>
        <div>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle bg-red-600" />
          Critical {C}%
        </div>
      </div>
      
      <p className="mt-3 text-xs text-blue-600 font-medium">
        Click to view cities →
      </p>
    </div>
  )
}

// Popup component for cities and offices
function LocationPopup({ location }: { location: LocationData }) {
  const total = location.metrics.Healthy + location.metrics.Warning + location.metrics.Critical || 1
  const H = pct((location.metrics.Healthy / total) * 100)
  const W = pct((location.metrics.Warning / total) * 100)
  const C = pct((location.metrics.Critical / total) * 100)
  
  return (
    <div className="w-56 p-2">
      <div className="mb-2">
        <h3 className="text-md font-semibold">{location.name}</h3>
        <p className="text-sm text-gray-600">
          {location.deviceCount} devices
          {location.level === 'city' && location.children && ` • ${location.children.length} offices`}
        </p>
      </div>
      
      {/* Health bar */}
      <div className="mb-2 flex h-2 w-full overflow-hidden rounded">
        <div style={{ width: `${H}%`, background: "#10b981" }} />
        <div style={{ width: `${W}%`, background: "#f59e0b" }} />
        <div style={{ width: `${C}%`, background: "#dc2626" }} />
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle bg-emerald-500" />
          {H}%
        </div>
        <div>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle bg-amber-500" />
          {W}%
        </div>
        <div>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle bg-red-600" />
          {C}%
        </div>
      </div>
      
      <p className="mt-2 text-xs text-blue-600 font-medium">
        Click to {location.level === 'city' ? 'view offices' : 'view details'} →
      </p>
    </div>
  )
}

export default HierarchicalLocationMap
