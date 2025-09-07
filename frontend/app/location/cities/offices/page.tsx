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
import { OfficeHealthCard } from "@/components/circular-health-chart"
import { OfficeHealthSummary } from "@/components/office-health-summary"
import { calculateOfficeHealth, type Device } from "@/lib/office-health"

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

export default function OfficesPage() {
  const searchParams = useSearchParams()
  const location = searchParams.get('location') || ''
  const [country, city] = location.split(',')
  
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [totalStats, setTotalStats] = useState({ totalOffices: 0, totalDevices: 0 })
  const [officeHealthData, setOfficeHealthData] = useState<{ [officeId: string]: any }>({})

  // Fetch offices data for the specific city
  const fetchOfficesData = async () => {
    if (!country || !city) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/offices?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`)
      const data = await response.json()
      
      if (data.success && data.offices) {
        setOffices(data.offices)
        setTotalStats({
          totalOffices: data.offices.length,
          totalDevices: data.offices.reduce((sum: number, office: Office) => sum + office.device_count, 0)
        })

        // Fetch health data for each office
        const healthData: { [officeId: string]: any } = {}
        for (const office of data.offices) {
          try {
            // Fetch devices for this office
            const devicesResponse = await fetch('/api/hosts/all')
            if (devicesResponse.ok) {
              const devicesData = await devicesResponse.json()
              const officeDevices = devicesData.hosts.filter((device: any) => 
                device.location === office.office
              )
              
              // Calculate health data
              const health = await calculateOfficeHealth(officeDevices)
              healthData[office._id] = {
                ...health,
                devices: officeDevices
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch health data for office ${office.office}:`, error)
            // Set default health data
            healthData[office._id] = {
              officeName: office.office,
              deviceCount: office.device_count,
              healthScore: 0,
              status: 'critical',
              healthyDevices: 0,
              warningDevices: 0,
              criticalDevices: office.device_count,
              offlineDevices: 0,
              totalInterfaces: 0,
              upInterfaces: 0,
              downInterfaces: 0,
              networkHealth: 0,
              devices: []
            }
          }
        }
        setOfficeHealthData(healthData)
      }
    } catch (error) {
      console.error('Error fetching offices data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOfficesData()
  }, [country, city])

  const handleCreateOffice = () => {
    setIsCreateFormOpen(true)
  }

  const handleFormClose = () => {
    setIsCreateFormOpen(false)
  }

  const handleFormSuccess = () => {
    setIsCreateFormOpen(false)
    fetchOfficesData() // Refresh data after creating office
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Inactive</Badge>
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="text-center py-12">Loading offices data...</div>
      </main>
    )
  }

  if (!country || !city) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Location Specified</h3>
          <p className="text-muted-foreground">Please specify a location parameter with country and city.</p>
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
            <h1 className="text-2xl font-semibold text-balance">{city} - Network Health Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {country} • {totalStats.totalOffices} offices 
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
        {offices.length > 0 ? (
          offices.map((office) => {
            const healthData = officeHealthData[office._id]
            return (
              <Link key={office._id} href={`/location/cities/offices/${office._id}`}>
                {healthData ? (
                  <OfficeHealthSummary
                    devices={healthData.devices || []}
                    officeName={office.office}
                    deviceCount={office.device_count}
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                  />
                ) : (
                  <Card className="hover:shadow-lg transition-shadow border-2 cursor-pointer w-[30vw]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-600" />
                        {office.office}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(office.status)}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold mb-2">{office.device_count}</div>
                      <p className="text-xs text-muted-foreground mb-2">devices</p>
                      <div className="text-sm text-muted-foreground">
                        Contact: {office.contact_info.person}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {office.contact_info.email}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {office.contact_info.phone}
                      </div>
                      {office.description && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {office.description}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Link>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Offices Found</h3>
            <p className="text-muted-foreground mb-4">
              No offices were found in {city}, {country}.
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
        city={city}
        country={country}
        isOpen={isCreateFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </main>
  )
}
