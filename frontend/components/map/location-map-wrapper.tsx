"use client"

import dynamic from "next/dynamic"
import { Map } from "lucide-react"

// Type definition for the map component props
export type LocationData = {
  level: 'country' | 'city' | 'office';
  name: string;
  slug: string;
  metrics: {
    Healthy: number;
    Warning: number;
    Critical: number;
  };
  deviceCount: number;
  children?: LocationData[];
}

// Dynamically import map component to avoid SSR issues
const HierarchicalLocationMap = dynamic(
  () => import("./hierarchical-location-map"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <div className="text-center">
          <Map className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }
)

interface LocationMapWrapperProps {
  locations: LocationData[];
}

export function LocationMapWrapper({ locations }: LocationMapWrapperProps) {
  return <HierarchicalLocationMap locations={locations} />
}
