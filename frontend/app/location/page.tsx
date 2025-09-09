"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Globe, Building, Users, ArrowRight, Map, Grid3X3 } from "lucide-react"
import { OfficeCreationForm } from "@/components/office-creation-form"
import { CountryHealthSummary } from "@/components/country-health-summary"
import { LocationMap } from "@/components/location-map"

interface CountryData {
  country: string
  cities: string[]
  totalOffices: number
  totalDevices: number
  offices: any[]
}

export default function LocationPage() {
  const [countries, setCountries] = useState<CountryData[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [countryHealthData, setCountryHealthData] = useState<{ [countryName: string]: any }>({})
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards')

  // Fetch countries data
  const fetchCountriesData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/offices')
      const data = await response.json()
      
      if (data.success && data.offices) {
        // Group offices by country
        const grouped: { [key: string]: { cities: Set<string>, offices: any[] } } = {}
        
        data.offices.forEach((office: any) => {
          if (!grouped[office.country]) {
            grouped[office.country] = { cities: new Set(), offices: [] }
          }
          grouped[office.country].cities.add(office.city)
          grouped[office.country].offices.push(office)
        })

        // Convert to country data structure
        const countryData: CountryData[] = Object.entries(grouped).map(([country, data]) => ({
          country,
          cities: Array.from(data.cities),
          totalOffices: data.offices.length,
          totalDevices: data.offices.reduce((sum, office) => sum + office.device_count, 0),
          offices: data.offices
        }))

        setCountries(countryData)

        // Fetch real device data for each country
        const healthData: { [countryName: string]: any } = {}
        const normalize = (val?: string) => (val || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')
        const belongsToOffice = (device: any, office: any): boolean => {
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

        for (const country of countryData) {
          try {
            // Fetch devices for this country
            const devicesResponse = await fetch('/api/hosts/all')
            if (devicesResponse.ok) {
              const devicesData = await devicesResponse.json()
              const countryDevices = devicesData.hosts.filter((device: any) => 
                country.offices.some(office => belongsToOffice(device, office))
              )
              
              // Group devices by city
              const cityGroups: { [cityName: string]: any[] } = {}
              countryDevices.forEach((device: any) => {
                const office = country.offices.find(office => belongsToOffice(device, office))
                if (office) {
                  if (!cityGroups[office.city]) {
                    cityGroups[office.city] = []
                  }
                  cityGroups[office.city].push(device)
                }
              })

              // Create city data with real device counts
              const citiesWithData = country.cities.map(cityName => {
                const cityDevices = cityGroups[cityName] || []
                const cityOffices = country.offices.filter(office => office.city === cityName)
                return {
                  city: cityName,
                  totalOffices: cityOffices.length,
                  totalDevices: cityDevices.length,
                  offices: cityOffices
                }
              })

              // Calculate total devices for this country
              const totalCountryDevices = citiesWithData.reduce((sum, city) => sum + city.totalDevices, 0)

              healthData[country.country] = {
                cities: citiesWithData,
                totalDevices: totalCountryDevices
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch device data for country ${country.country}:`, error)
            // Create fallback city data
            const fallbackCities = country.cities.map(cityName => {
              const cityOffices = country.offices.filter(office => office.city === cityName)
              return {
                city: cityName,
                totalOffices: cityOffices.length,
                totalDevices: cityOffices.reduce((sum, office) => sum + office.device_count, 0),
                offices: cityOffices
              }
            })
            healthData[country.country] = {
              cities: fallbackCities,
              totalDevices: country.totalDevices
            }
          }
        }
        setCountryHealthData(healthData)
      }
    } catch (error) {
      console.error('Error fetching countries data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCountriesData()
  }, [])

  const handleCreateOffice = () => {
    setIsCreateFormOpen(true)
  }

  const handleFormClose = () => {
    setIsCreateFormOpen(false)
  }

  const handleFormSuccess = () => {
    setIsCreateFormOpen(false)
    fetchCountriesData() // Refresh data after creating office
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="glass-panel p-8 text-center text-slate-200">Loading countries data...</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <div className="glass-panel p-5 md:p-6 flex items-center justify-between" style={{ ['--glass-radius' as any]: '0px' }}>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Nationality - Network Health Dashboard</h1>
            <p className="text-sm text-slate-300">
              {countries.length} countries • {countries.reduce((sum, country) => sum + country.totalOffices, 0)} offices • {Object.values(countryHealthData).reduce((sum: number, healthData: any) => sum + (healthData?.totalDevices || 0), 0)} devices
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="glass-panel rounded-none flex items-center border border-white/10">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="rounded-none"
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              className="btn-glass flex items-center gap-2"
              onClick={handleCreateOffice}
            >
              <Plus className="h-4 w-4" />
              Create Office
            </Button>
          </div>
        </div>
      </header>

      {viewMode === 'cards' ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countries.length > 0 ? (
            countries.map((countryData) => {
              // Check if this is India to show health monitoring
              const isIndia = countryData.country.toLowerCase() === 'india'
              const healthData = countryHealthData[countryData.country]
              
              return (
                <Link key={countryData.country} href={`/location/cities/?loc=${encodeURIComponent(countryData.country)}`}>
                  {isIndia ? (
                    <CountryHealthSummary
                      cities={healthData?.cities || []}
                      countryName="India"
                      totalOffices={countryData.totalOffices}
                      totalDevices={healthData?.totalDevices || countryData.totalDevices}
                      className="glass-panel hover:shadow-lg transition-all duration-200 cursor-pointer"
                    />
                  ) : (
                    <Card className="glass-panel hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                          <Globe className="h-5 w-5 text-blue-400" />
                          {countryData.country}
                        </CardTitle>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-slate-100">{countryData.totalOffices}</div>
                        <p className="text-xs text-slate-400">offices</p>
                        <div className="text-sm text-slate-300 mt-2">
                          {countryData.cities.length} cities • {countryData.totalDevices} devices
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Link>
              )
            })
          ) : (
            <div className="col-span-full glass-panel p-8 text-center">
              <Globe className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-slate-100">No Countries Found</h3>
              <p className="text-slate-300 mb-4">No countries with offices were found.</p>
              <p className="text-sm text-slate-400">Create an office to get started.</p>
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="glass-panel p-4">
            <LocationMap 
              offices={countries.flatMap(country => country.offices).filter(office => office.geo?.lat && office.geo?.lon)}
              className="w-full"
            />
          </div>
        </section>
      )}

      {/* Office Creation Form */}
      <OfficeCreationForm
        location="Location Not Found"
        city="Unknown"
        country=""
        isOpen={isCreateFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </main>
  )
}
