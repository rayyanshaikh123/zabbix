"use client"

import { LeafletMap } from '@/components/leaflet-map'

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

interface LocationMapProps {
  offices: Office[]
  className?: string
}

export function LocationMap({ offices, className = '' }: LocationMapProps) {
  return <LeafletMap offices={offices} className={className} />
}