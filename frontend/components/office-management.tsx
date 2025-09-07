"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, MapPin, Building, Users, Activity } from 'lucide-react'

interface Office {
  _id?: string
  office: string
  city: string
  country: string
  geo: {
    lat: number
    lon: number
    source: string
  }
  description: string
  contact_info: Record<string, any>
  created_at: string
  updated_at: string
  device_count: number
  status: string
}

interface OfficeManagementProps {
  country: string
  city: string
  onOfficeChange?: () => void
}

export function OfficeManagement({ country, city, onOfficeChange }: OfficeManagementProps) {
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingOffice, setEditingOffice] = useState<Office | null>(null)
  const [formData, setFormData] = useState({
    office: '',
    city: city,
    country: country,
    geo: { lat: 0, lon: 0, source: 'manual' },
    description: '',
    contact_info: {},
    status: 'active'
  })

  // Fetch offices for this city and country
  const fetchOffices = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/offices?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`)
      const data = await response.json()
      
      if (data.success) {
        setOffices(data.offices || [])
      }
    } catch (error) {
      console.error('Error fetching offices:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffices()
  }, [country, city])

  const handleCreateOffice = async () => {
    try {
      const response = await fetch('/api/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateDialogOpen(false)
        setFormData({
          office: '',
          city: city,
          country: country,
          geo: { lat: 0, lon: 0, source: 'manual' },
          description: '',
          contact_info: {},
          status: 'active'
        })
        fetchOffices()
        onOfficeChange?.()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating office:', error)
      alert('Failed to create office')
    }
  }

  const handleUpdateOffice = async () => {
    if (!editingOffice) return
    
    try {
      const response = await fetch(`/api/offices/${editingOffice._id || editingOffice.office}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEditDialogOpen(false)
        setEditingOffice(null)
        fetchOffices()
        onOfficeChange?.()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating office:', error)
      alert('Failed to update office')
    }
  }

  const handleDeleteOffice = async (office: Office) => {
    if (!confirm(`Are you sure you want to delete office "${office.office}"? This will also remove all associated devices.`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/offices/${office._id || office.office}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchOffices()
        onOfficeChange?.()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting office:', error)
      alert('Failed to delete office')
    }
  }

  const openEditDialog = (office: Office) => {
    setEditingOffice(office)
    setFormData({
      office: office.office,
      city: office.city,
      country: office.country,
      geo: office.geo,
      description: office.description,
      contact_info: office.contact_info,
      status: office.status
    })
    setIsEditDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="flex items-center gap-1"><Activity className="h-3 w-3" />Active</Badge>
      case 'inactive':
        return <Badge variant="secondary" className="flex items-center gap-1"><Building className="h-3 w-3" />Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Office Management</CardTitle>
          <CardDescription>Loading offices...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Office Management</CardTitle>
            <CardDescription>Manage offices in {city}, {country}</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Office
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Office</DialogTitle>
                <DialogDescription>
                  Add a new office to {city}, {country}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Office Name</label>
                    <Input
                      value={formData.office}
                      onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                      placeholder="e.g., Mumbai Suburban"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.geo.lat}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        geo: { ...formData.geo, lat: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="19.1399"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.geo.lon}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        geo: { ...formData.geo, lon: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="72.8435"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Office description..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateOffice}>Create Office</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {offices.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Offices Found</h3>
            <p className="text-muted-foreground mb-4">
              No offices are currently registered in {city}, {country}.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Office
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {offices.map((office) => (
              <div key={office._id || office.office} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{office.office}</div>
                    <div className="text-sm text-muted-foreground">
                      {office.city}, {office.country}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      📍 {office.geo.lat.toFixed(4)}, {office.geo.lon.toFixed(4)} • 
                      📅 Created: {new Date(office.created_at).toLocaleDateString()}
                    </div>
                    {office.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {office.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-medium">{office.device_count} devices</div>
                    {getStatusBadge(office.status)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(office)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteOffice(office)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Office Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Office</DialogTitle>
              <DialogDescription>
                Update office information for {editingOffice?.office}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Office Name</label>
                  <Input
                    value={formData.office}
                    onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                    placeholder="e.g., Mumbai Suburban"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.geo.lat}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      geo: { ...formData.geo, lat: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="19.1399"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.geo.lon}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      geo: { ...formData.geo, lon: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="72.8435"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Office description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateOffice}>Update Office</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
