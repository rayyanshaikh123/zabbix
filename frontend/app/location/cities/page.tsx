"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/back-button"
import { Plus, Building, Activity, AlertTriangle, CheckCircle, Clock, ArrowRight } from "lucide-react"
import { OfficeCreationForm } from "@/components/office-creation-form"
import { CityHealthSummary } from "@/components/city-health-summary"

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
  description: string
  contact_info: {
    person: string
    email: string
    phone: string
    address: string
    capacity: string
    notes: string
  }
  device_count: number
  status: string
  created_at: string
  updated_at: string
}

interface CityData {
  city: string
  offices: Office[]
  totalOffices: number
  totalDevices: number
}

export default function CitiesPage() {
  const searchParams = useSearchParams()
  const loc = searchParams.get('loc') || ''
  
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [cities, setCities] = useState<CityData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalStats, setTotalStats] = useState({ totalOffices: 0, totalDevices: 0 })
  const [cityHealthData, setCityHealthData] = useState<{ [cityName: string]: any }>({})

  // Fetch cities data for the specific country
  const fetchCitiesData = async () => {
    if (!loc) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/offices?country=${encodeURIComponent(loc)}`)
      const data = await response.json()
      
      if (data.success && data.offices) {
        // Group offices by city
        const grouped: { [key: string]: Office[] } = {}
        
        data.offices.forEach((office: Office) => {
          if (!grouped[office.city]) {
            grouped[office.city] = []
          }
          grouped[office.city].push(office)
        })

        // Convert to city data structure
        const cityData: CityData[] = Object.entries(grouped).map(([city, offices]) => ({
          city,
          offices,
          totalOffices: offices.length,
          totalDevices: offices.reduce((sum, office) => sum + office.device_count, 0)
        }))

        setCities(cityData)
        setTotalStats({
          totalOffices: cityData.reduce((sum, city) => sum + city.totalOffices, 0),
          totalDevices: cityData.reduce((sum, city) => sum + city.totalDevices, 0)
        })

        // Fetch real device data for each city
        const healthData: { [cityName: string]: any } = {}
        for (const city of cityData) {
          try {
            // Fetch devices for this city
            const devicesResponse = await fetch('/api/hosts/all')
            if (devicesResponse.ok) {
              const devicesData = await devicesResponse.json()
              const cityDevices = devicesData.hosts.filter((device: any) => 
                city.offices.some(office => device.location === office.office)
              )
              
              // Calculate real device count for each office
              const updatedOffices = city.offices.map(office => {
                const officeDevices = cityDevices.filter((device: any) => 
                  device.location === office.office
                )
                return {
                  ...office,
                  device_count: officeDevices.length
                }
              })

              // Calculate total devices for this city
              const totalCityDevices = updatedOffices.reduce((sum, office) => sum + office.device_count, 0)

              healthData[city.city] = {
                offices: updatedOffices,
                totalDevices: totalCityDevices
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch device data for city ${city.city}:`, error)
            healthData[city.city] = {
              offices: city.offices,
              totalDevices: city.totalDevices
            }
          }
        }
        setCityHealthData(healthData)
        
        // Update totalStats with real device data
        const realTotalDevices = Object.values(healthData).reduce((sum: number, healthData: any) => sum + (healthData?.totalDevices || 0), 0)
        
        // If no real device data found, use the database device counts as fallback
        const fallbackTotalDevices = realTotalDevices > 0 ? realTotalDevices : cityData.reduce((sum, city) => sum + city.totalDevices, 0)
        
        setTotalStats(prevStats => ({
          ...prevStats,
          totalDevices: fallbackTotalDevices
        }))
      }
    } catch (error) {
      console.error('Error fetching cities data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCitiesData()
  }, [loc])

  const handleCreateOffice = () => {
    setIsCreateFormOpen(true)
  }

  const handleFormClose = () => {
    setIsCreateFormOpen(false)
  }

  const handleFormSuccess = () => {
    setIsCreateFormOpen(false)
    fetchCitiesData() // Refresh data after creating office
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="text-center py-12">Loading cities data...</div>
      </main>
    )
  }

  if (!loc) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Location Specified</h3>
          <p className="text-muted-foreground">Please specify a location parameter.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-balance">{loc} - Network Health Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {totalStats.totalOffices} offices • {totalStats.totalDevices} devices
            </p>
          </div>
          <Button 
            className="flex items-center gap-2"
            onClick={handleCreateOffice}
          >
            <Plus className="h-4 w-4" />
            Create Office
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cities.length > 0 ? (
          cities.map((cityData) => {
            // Check if this is Mumbai to show health monitoring
            const isMumbai = cityData.city.toLowerCase() === 'mumbai'
            const healthData = cityHealthData[cityData.city]
            
            return (
              <Link key={cityData.city} href={`/location/cities/offices?location=${encodeURIComponent(loc)},${encodeURIComponent(cityData.city)}`}>
                {isMumbai ? (
                  <CityHealthSummary
                    offices={healthData?.offices || cityData.offices}
                    cityName="Mumbai"
                    totalOffices={cityData.totalOffices}
                    totalDevices={healthData?.totalDevices || cityData.totalDevices}
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                  />
                ) : (
                  <Card className="hover:shadow-lg transition-shadow border-2 cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Building className="h-5 w-5 text-green-600" />
                        {cityData.city}
                      </CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cityData.totalOffices}</div>
                      <p className="text-xs text-muted-foreground">offices</p>
                      <div className="text-sm text-muted-foreground mt-2">
                        {cityData.totalDevices} devices
                      </div>
                    </CardContent>
                  </Card>
                )}
              </Link>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Cities Found</h3>
            <p className="text-muted-foreground mb-4">
              No cities with offices were found in {loc}.
            </p>
            <p className="text-sm text-muted-foreground">
              Create an office to get started.
            </p>
          </div>
        )}
      </section>

      {/* Office Creation Form */}
      <OfficeCreationForm
        location="Location Not Found"
        city="Unknown"
        country={loc}
        isOpen={isCreateFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </main>
  )
}
