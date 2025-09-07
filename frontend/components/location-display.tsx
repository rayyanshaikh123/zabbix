'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { getLocationName, reverseGeocode, type ReverseGeocodeResult } from '@/lib/geocoding'

interface LocationDisplayProps {
  lat: number
  lon: number
  source?: string
  className?: string
  showFullAddress?: boolean
  inline?: boolean
}

export function LocationDisplay({ 
  lat, 
  lon, 
  source, 
  className = '', 
  showFullAddress = false,
  inline = false
}: LocationDisplayProps) {
  const [locationName, setLocationName] = useState<string>('')
  const [fullAddress, setFullAddress] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function fetchLocation() {
      try {
        setLoading(true)
        setError('')
        
        if (showFullAddress) {
          // Get full address details
          const result = await reverseGeocode(lat, lon)
          if (result) {
            setFullAddress(result.address)
            setLocationName(result.address)
          } else {
            setLocationName(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)
            setError('Unable to resolve address')
          }
        } else {
          // Get short location name
          const name = await getLocationName(lat, lon)
          setLocationName(name)
        }
      } catch (err) {
        console.error('Location fetch error:', err)
        setLocationName(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)
        setError('Failed to load location')
      } finally {
        setLoading(false)
      }
    }

    if (lat && lon) {
      fetchLocation()
    } else {
      setLocationName('Unknown Location')
      setLoading(false)
    }
  }, [lat, lon, showFullAddress])

  if (loading) {
    if (inline) {
      return <span className={`text-sm text-muted-foreground ${className}`}>Loading location...</span>
    }
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading location...</span>
      </div>
    )
  }

  if (inline) {
    return (
      <span className={`text-sm ${error ? 'text-red-600' : 'text-muted-foreground'} ${className}`}>
        {locationName}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className={error ? 'text-red-600' : 'text-muted-foreground'}>
          {locationName}
        </span>
        {source && (
          <span className="text-xs text-muted-foreground/70">
            Source: {source}
          </span>
        )}
        {error && (
          <span className="text-xs text-red-500">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
