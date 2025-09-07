"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, CheckCircle, Clock, Plus, Edit, Trash2, Server, Wifi, Monitor } from 'lucide-react'

interface Device {
  hostid: string
  device_id: string
  location: string
  geo?: {
    lat: number
    lon: number
    source: string
  }
  device_type?: string
  last_seen: string
  status: string
  severity: string
}

interface DeviceManagementProps {
  location: string
  city: string
  onDeviceChange?: () => void
}

export function DeviceManagement({ location, city, onDeviceChange }: DeviceManagementProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [formData, setFormData] = useState({
    device_id: '',
    hostid: '',
    location: location,
    device_type: 'other',
    geo: { lat: 0, lon: 0, source: 'manual' }
  })

  // Fetch devices for this location
  const fetchDevices = async () => {
    try {
      setLoading(true)
      // First get offices in this city to find the specific office
      const officesResponse = await fetch(`/api/offices?city=${encodeURIComponent(city)}`)
      const officesData = await officesResponse.json()
      
      if (officesData.success) {
        const targetOffice = officesData.offices.find((office: any) => office.office === location)
        if (targetOffice) {
          // Fetch devices for this specific office
          const response = await fetch(`/api/devices?location=${encodeURIComponent(location)}&city=${encodeURIComponent(city)}`)
          const data = await response.json()
          
          if (data.success) {
            setDevices(data.devices || [])
          }
        } else {
          setDevices([])
        }
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [location, city])

  const handleCreateDevice = async () => {
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateDialogOpen(false)
        setFormData({
          device_id: '',
          hostid: '',
          location: location,
          device_type: 'other',
          geo: { lat: 0, lon: 0, source: 'manual' }
        })
        fetchDevices()
        onDeviceChange?.()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating device:', error)
      alert('Failed to create device')
    }
  }

  const handleUpdateDevice = async () => {
    if (!editingDevice) return
    
    try {
      const response = await fetch(`/api/devices/${editingDevice.hostid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEditDialogOpen(false)
        setEditingDevice(null)
        fetchDevices()
        onDeviceChange?.()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating device:', error)
      alert('Failed to update device')
    }
  }

  const handleDeleteDevice = async (device: Device) => {
    if (!confirm(`Are you sure you want to delete device "${device.device_id}"?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/devices/${device.hostid}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchDevices()
        onDeviceChange?.()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting device:', error)
      alert('Failed to delete device')
    }
  }

  const openEditDialog = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      device_id: device.device_id,
      hostid: device.hostid,
      location: device.location,
      device_type: device.device_type || 'other',
      geo: device.geo || { lat: 0, lon: 0, source: 'manual' }
    })
    setIsEditDialogOpen(true)
  }

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType?.toLowerCase().includes('router')) return <Wifi className="h-4 w-4" />
    if (deviceType?.toLowerCase().includes('switch')) return <Server className="h-4 w-4" />
    if (deviceType?.toLowerCase().includes('pc') || deviceType?.toLowerCase().includes('computer')) return <Monitor className="h-4 w-4" />
    return <Server className="h-4 w-4" />
  }

  const getStatusBadge = (status: string, severity: string) => {
    if (severity === 'critical') {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>
    }
    if (severity === 'warning') {
      return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Warning</Badge>
    }
    return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Operational</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Management</CardTitle>
          <CardDescription>Loading devices...</CardDescription>
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
            <CardTitle>Device Management</CardTitle>
            <CardDescription>Manage devices in {location}</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Add a new device to {location}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Device ID</label>
                  <Input
                    value={formData.device_id}
                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                    placeholder="e.g., Router-01"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Host ID</label>
                  <Input
                    value={formData.hostid}
                    onChange={(e) => setFormData({ ...formData, hostid: e.target.value })}
                    placeholder="e.g., 10001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Device Type</label>
                  <Select value={formData.device_type} onValueChange={(value) => setFormData({ ...formData, device_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="router">Router</SelectItem>
                      <SelectItem value="switch">Switch</SelectItem>
                      <SelectItem value="pc">PC</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Device location"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDevice}>Create Device</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
            <p className="text-muted-foreground mb-4">
              No devices are currently assigned to {location}.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Device
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.hostid} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(device.device_type || 'other')}
                  <div>
                    <div className="font-medium">{device.device_id}</div>
                    <div className="text-sm text-muted-foreground">
                      Host ID: {device.hostid} • Type: {device.device_type || 'other'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last seen: {new Date(device.last_seen).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(device.status, device.severity)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(device)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteDevice(device)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Device Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Device</DialogTitle>
              <DialogDescription>
                Update device information for {editingDevice?.device_id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Device ID</label>
                <Input
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  placeholder="e.g., Router-01"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Host ID</label>
                <Input
                  value={formData.hostid}
                  onChange={(e) => setFormData({ ...formData, hostid: e.target.value })}
                  placeholder="e.g., 10001"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Device Type</label>
                <Select value={formData.device_type} onValueChange={(value) => setFormData({ ...formData, device_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="router">Router</SelectItem>
                    <SelectItem value="switch">Switch</SelectItem>
                    <SelectItem value="pc">PC</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Device location"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateDevice}>Update Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
