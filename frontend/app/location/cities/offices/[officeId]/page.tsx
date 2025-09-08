"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { BackButton } from "@/components/back-button"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Wifi,
  Monitor,
  Settings,
  PieChart,
  BarChart3,
  Network,
  HardDrive,
  Cpu,
  MemoryStick,
  Thermometer,
  Zap,
  Fan,
  Shield,
  Globe,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  Bot
} from "lucide-react"
import { toast } from "sonner"
import { LocationDisplay } from "@/components/location-display"
import { DeviceHealthMonitor } from "@/components/device-health-monitor"
import { OfficeHealthOverview } from "@/components/office-health-overview"
import { CircularHealthChart } from "@/components/circular-health-chart"
import { HealthDashboard } from "@/components/health-dashboard"
import { AITroubleshootModal } from "@/components/ai-troubleshoot-modal"

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

interface Device {
  hostid: string
  device_id: string
  status: string
  severity: string
  last_seen: Date
  deviceType: string
  location: string
  interface_count: number
  total_metrics: number
}

interface DeviceStats {
  total: number
  routers: number
  switches: number
  pcs: number
  other: number
  online: number
  offline: number
  critical: number
  warning: number
  healthy: number
}

export default function OfficeDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const officeId = params.officeId as string
  
  const [office, setOffice] = useState<Office | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceStats>({
    total: 0, routers: 0, switches: 0, pcs: 0, other: 0,
    online: 0, offline: 0, critical: 0, warning: 0, healthy: 0
  })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Office>>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [officeHealthScore, setOfficeHealthScore] = useState(0)
  const [officeHealthStatus, setOfficeHealthStatus] = useState<'excellent' | 'good' | 'warning' | 'critical'>('critical')
  const [zabbixServer, setZabbixServer] = useState<any>(null)

  // Fetch Zabbix server information
  const fetchZabbixServer = async () => {
    try {
      const response = await fetch('/api/zabbix-server')
      const data = await response.json()
      
      if (data.success && data.server) {
        setZabbixServer(data.server)
      }
    } catch (error) {
      console.error('Error fetching Zabbix server info:', error)
    }
  }

  // Fetch office details
  const fetchOfficeDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/offices/${officeId}`)
      const data = await response.json()
      
      if (data.success && data.office) {
        setOffice(data.office)
        setEditForm(data.office)
      } else {
        toast.error('Office not found')
        router.back()
      }
    } catch (error) {
      console.error('Error fetching office:', error)
      toast.error('Failed to fetch office details')
    } finally {
      setLoading(false)
    }
  }

  // Fetch devices for this office
  const fetchDevices = async () => {
    if (!office) return
    
    try {
      const response = await fetch(`/api/hosts/all`)
      const data = await response.json()
      
      if (data.hosts) {
        // Filter devices that belong to this office
        const officeDevices = data.hosts.filter((device: any) => 
          device.location === office.office
        )
        setDevices(officeDevices)
        
        // Calculate device statistics
        const stats: DeviceStats = {
          total: officeDevices.length,
          routers: officeDevices.filter((d: any) => d.device_id.toLowerCase().includes('router') || d.device_id.toLowerCase().includes('r1')).length,
          switches: officeDevices.filter((d: any) => d.device_id.toLowerCase().includes('switch') || d.device_id.toLowerCase().includes('s1')).length,
          pcs: officeDevices.filter((d: any) => d.device_id.toLowerCase().includes('pc') || d.device_id.toLowerCase().includes('computer')).length,
          other: officeDevices.filter((d: any) => 
            !d.device_id.toLowerCase().includes('router') && 
            !d.device_id.toLowerCase().includes('switch') && 
            !d.device_id.toLowerCase().includes('pc') &&
            !d.device_id.toLowerCase().includes('r1') &&
            !d.device_id.toLowerCase().includes('s1')
          ).length,
          online: officeDevices.filter((d: any) => d.status === 'Up' || d.status === 'Operational').length,
          offline: officeDevices.filter((d: any) => d.status === 'Down' || d.status === 'Offline').length,
          critical: officeDevices.filter((d: any) => d.severity === 'critical' || d.severity === 'error').length,
          warning: officeDevices.filter((d: any) => d.severity === 'warning').length,
          healthy: officeDevices.filter((d: any) => d.severity === 'info' || d.severity === 'healthy').length
        }
        setDeviceStats(stats)
        
        // Calculate office health score
        const officeHealthScore = calculateOfficeHealthScore(stats)
        setOfficeHealthScore(officeHealthScore)
        
        // Determine health status
        if (officeHealthScore >= 90) {
          setOfficeHealthStatus('excellent')
        } else if (officeHealthScore >= 75) {
          setOfficeHealthStatus('good')
        } else if (officeHealthScore >= 50) {
          setOfficeHealthStatus('warning')
        } else {
          setOfficeHealthStatus('critical')
        }
        
        // Update the office's device count in the database if it's different
        if (office && stats.total !== office.device_count) {
          try {
            await fetch(`/api/offices/${officeId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...office,
                device_count: stats.total
              })
            })
            // Update the local office state
            setOffice(prev => prev ? { ...prev, device_count: stats.total } : null)
          } catch (error) {
            console.warn('Failed to update office device count:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }

  useEffect(() => {
    if (officeId) {
      fetchOfficeDetails()
      fetchZabbixServer()
    }
  }, [officeId])

  useEffect(() => {
    if (office) {
      fetchDevices()
    }
  }, [office])

  const handleEdit = () => {
    setEditing(true)
    setEditForm(office || {})
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setEditForm(office || {})
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/offices/${officeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setOffice(data.office)
        setEditing(false)
        toast.success('Office updated successfully')
      } else {
        toast.error(data.error || 'Failed to update office')
      }
    } catch (error) {
      console.error('Error updating office:', error)
      toast.error('Failed to update office')
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/offices/${officeId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Office deleted successfully')
        router.push('/location')
      } else {
        toast.error(data.error || 'Failed to delete office')
      }
    } catch (error) {
      console.error('Error deleting office:', error)
      toast.error('Failed to delete office')
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Inactive</Badge>
  }

  const getDeviceIcon = (deviceId: string) => {
    if (deviceId.toLowerCase().includes('router') || deviceId.toLowerCase().includes('r1')) return <Wifi className="h-4 w-4" />
    if (deviceId.toLowerCase().includes('switch') || deviceId.toLowerCase().includes('s1')) return <Server className="h-4 w-4" />
    if (deviceId.toLowerCase().includes('pc') || deviceId.toLowerCase().includes('computer')) return <Monitor className="h-4 w-4" />
    return <Server className="h-4 w-4" />
  }

  const getDeviceStatusBadge = (status: string, severity: string) => {
    if (severity === 'critical') {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>
    }
    if (severity === 'warning') {
      return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Warning</Badge>
    }
    return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Operational</Badge>
  }

  const calculateOfficeHealthScore = (stats: DeviceStats): number => {
    if (stats.total === 0) return 0
    
    let score = 100
    
    // Penalize for offline devices
    if (stats.offline > 0) {
      score -= (stats.offline / stats.total) * 50
    }
    
    // Penalize for critical devices
    if (stats.critical > 0) {
      score -= (stats.critical / stats.total) * 30
    }
    
    // Penalize for warning devices
    if (stats.warning > 0) {
      score -= (stats.warning / stats.total) * 15
    }
    
    return Math.max(0, Math.round(score))
  }

  // Pie Chart Component for Device Distribution
  const DeviceDistributionPieChart = () => {
    const data = [
      { label: 'Routers', value: deviceStats.routers, color: '#3B82F6', icon: Wifi },
      { label: 'Switches', value: deviceStats.switches, color: '#10B981', icon: Server },
      { label: 'PCs', value: deviceStats.pcs, color: '#F59E0B', icon: Monitor },
      { label: 'Other', value: deviceStats.other, color: '#8B5CF6', icon: HardDrive }
    ].filter(item => item.value > 0)

    const total = data.reduce((sum, item) => sum + item.value, 0)
    
    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No devices to display</p>
          </div>
        </div>
      )
    }

    let cumulativePercentage = 0

    return (
      <div className="relative w-64 h-64 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100
            const startAngle = cumulativePercentage * 3.6
            const endAngle = (cumulativePercentage + percentage) * 3.6
            cumulativePercentage += percentage

            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
            const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180)
            const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180)

            const largeArcFlag = percentage > 50 ? 1 : 0

            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')

            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                className="hover:opacity-80 transition-opacity"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground">Total Devices</div>
          </div>
        </div>
      </div>
    )
  }

  // Visual Architecture Component
  const NetworkArchitecture = () => {
    // Get total interfaces from all devices
    const totalInterfaces = devices.reduce((sum, device) => sum + (device.interface_count || 0), 0)
    
    // Function to get interface status and color
    const getInterfaceStatus = (interfaceName: string) => {
      // Check if we have devices connected
      if (devices.length === 0) {
        return { status: 'unknown', color: 'gray' }
      }
      
      // For Fa0/0 - connected to Zabbix server (should be up)
      if (interfaceName === 'Fa0/0') {
        return { status: 'up', color: 'green' }
      }
      
      // For Fa0/1 - check if it has connected devices or is idle
      if (interfaceName === 'Fa0/1') {
        // Check if there are devices that would be connected to Fa0/1
        // This could be switches, PCs, or other network devices
        const hasConnectedDevices = devices.some(device => 
          device.interface_count && device.interface_count > 1 // More than just Fa0/0
        )
        
        if (hasConnectedDevices) {
          return { status: 'up', color: 'green' }
        } else {
          return { status: 'idle', color: 'blue' }
        }
      }
      
      // For other interfaces, check if they have connected devices
      const hasConnectedDevices = devices.some(device => 
        device.interface_count && device.interface_count > 0
      )
      
      if (hasConnectedDevices) {
        return { status: 'up', color: 'green' }
      } else {
        return { status: 'idle', color: 'blue' }
      }
    }
    
    // Get interface colors based on status
    const getInterfaceColor = (status: string) => {
      switch (status) {
        case 'up':
          return 'from-green-400 to-green-600'
        case 'down':
          return 'from-red-400 to-red-600'
        case 'idle':
          return 'from-blue-400 to-blue-600'
        case 'unknown':
        default:
          return 'from-gray-400 to-gray-600'
      }
    }
    
    return (
      <div className="space-y-8">
        {/* Zabbix Server */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg">
            <Server className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium text-lg">Zabbix Server</div>
              <div className="text-sm opacity-90">
                {zabbixServer ? zabbixServer.hostname || zabbixServer.name : 'Monitoring Server'}
              </div>
            </div>
          </div>
        </div>

        {/* Server Information */}
        {zabbixServer && (
          <div className="flex justify-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hostname:</span>
                  <span className="font-mono">{zabbixServer.hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-mono">{zabbixServer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Host ID:</span>
                  <span className="font-mono">{zabbixServer.hostid}</span>
                </div>
                {zabbixServer.interfaces && zabbixServer.interfaces.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP Address:</span>
                    <span className="font-mono">{zabbixServer.interfaces[0].ip || 'N/A'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection Cable */}
        <div className="flex justify-center">
          <div className="relative">
            {(() => {
              const interfaceStatus = getInterfaceStatus('Fa0/0')
              const colorClass = getInterfaceColor(interfaceStatus.status)
              return (
                <>
                  <div className={`w-2 h-12 bg-gradient-to-b ${colorClass} rounded-full shadow-md`}></div>
                  <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    Fa0/0
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Core Router with Interfaces */}
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-lg flex items-center gap-3 shadow-lg">
            <Wifi className="h-7 w-7" />
            <div className="text-center">
              <div className="font-medium text-lg">Core Router</div>
              <div className="text-sm opacity-90">Cisco_R1</div>
            </div>
            <Badge variant="secondary" className="ml-2 bg-white/20 text-white">{deviceStats.routers}</Badge>
          </div>
          
          {/* Router Interfaces - Show Fa0/1 (bottom interface) */}
          {devices.filter(d => d.device_id.toLowerCase().includes('router') || d.device_id.toLowerCase().includes('r1')).map((router, index) => (
            <div key={index} className="flex items-center gap-4">
              {/* Show Fa0/1 interface (bottom interface) */}
              <div className="flex flex-col items-center">
                {(() => {
                  const interfaceStatus = getInterfaceStatus('Fa0/1')
                  const colorClass = getInterfaceColor(interfaceStatus.status)
                  return (
                    <>
                      <div className={`w-16 h-1 bg-gradient-to-r ${colorClass} rounded-full shadow-sm`}></div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">Fa0/1</div>
                      <div className="text-xs text-muted-foreground mt-1 capitalize">{interfaceStatus.status}</div>
                    </>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* Connection Cables */}
        <div className="flex justify-center gap-8">
          {Array.from({ length: Math.min(deviceStats.switches, 2) }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-1 h-16 bg-gradient-to-b from-green-500 to-orange-500 rounded-full shadow-md"></div>
              <div className="text-xs text-muted-foreground mt-2 font-mono">Cable {i + 1}</div>
            </div>
          ))}
        </div>

        {/* Distribution Layer - Switches */}
        <div className="flex justify-center gap-8">
          {deviceStats.switches > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-3 shadow-lg">
              <Server className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Switch</div>
                <div className="text-sm opacity-90">Distribution</div>
              </div>
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white">{deviceStats.switches}</Badge>
            </div>
          )}
        </div>

        {/* Switch Interfaces */}
        {deviceStats.switches > 0 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(totalInterfaces, 8) }, (_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-12 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-sm"></div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">Port {i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Cables to End Devices */}
        <div className="flex justify-center gap-4">
          {Array.from({ length: Math.min(deviceStats.pcs + deviceStats.other, 6) }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-1 h-12 bg-gradient-to-b from-orange-500 to-purple-500 rounded-full shadow-md"></div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">Cable</div>
            </div>
          ))}
        </div>

        {/* Access Layer - End Devices */}
        <div className="flex justify-center gap-6">
          {deviceStats.pcs > 0 && (
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
              <Monitor className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">PCs</div>
                <div className="text-sm opacity-90">Workstations</div>
              </div>
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white text-xs">{deviceStats.pcs}</Badge>
            </div>
          )}
          {deviceStats.other > 0 && (
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
              <HardDrive className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Other</div>
                <div className="text-sm opacity-90">Devices</div>
              </div>
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white text-xs">{deviceStats.other}</Badge>
            </div>
          )}
        </div>

        {/* Interface Status Legend */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-4">Interface Status Legend</h3>
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full"></div>
                <span className="text-green-600 font-medium">Up - Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full"></div>
                <span className="text-red-600 font-medium">Down - Disconnected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                <span className="text-blue-600 font-medium">Idle - No Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full"></div>
                <span className="text-gray-600 font-medium">Unknown - No Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network Summary */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">Network Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-600">Total Devices</div>
                <div className="text-2xl font-bold">{deviceStats.total}</div>
              </div>
              <div>
                <div className="font-medium text-green-600">Total Interfaces</div>
                <div className="text-2xl font-bold">{totalInterfaces}</div>
              </div>
              <div>
                <div className="font-medium text-orange-600">Active Connections</div>
                <div className="text-2xl font-bold">{deviceStats.online}</div>
              </div>
              <div>
                <div className="font-medium text-purple-600">Network Health</div>
                <div className="text-2xl font-bold text-green-600">
                  {deviceStats.total > 0 ? Math.round(((deviceStats.online / deviceStats.total) * 100)) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="text-center py-12">Loading office details...</div>
      </main>
    )
  }

  if (!office) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Office Not Found</h3>
          <p className="text-muted-foreground">The requested office could not be found.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      {/* Header Section */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <BackButton />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                <Building className="h-8 w-8" />
                {office.office}
              </h1>
              <p className="text-xl text-blue-100 mb-4">
                {office.city}, {office.country}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <span className="text-lg font-semibold">{deviceStats.total} Devices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <LocationDisplay 
                      lat={office.geo.lat} 
                      lon={office.geo.lon} 
                      inline={true}
                      className="text-lg"
                    />
                  </div>
                  {getStatusBadge(office.status)}
                </div>
                
                {/* Office Health Chart */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-blue-100">Office Health</div>
                    <div className="text-xs text-blue-200">
                      {deviceStats.healthy} healthy • {deviceStats.warning} warning • {deviceStats.critical} critical
                    </div>
                  </div>
                  <CircularHealthChart 
                    healthScore={officeHealthScore}
                    status={officeHealthStatus}
                    size="lg"
                    showDetails={false}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!editing ? (
                <>
                  <Button variant="secondary" onClick={handleEdit} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-white border-red-500/30">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Office</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{office.office}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancelEdit} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-white border-green-500/30">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Devices</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{deviceStats.total}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-full">
                <Server className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Online Devices</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{deviceStats.online}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Warnings</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{deviceStats.warning}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-3 bg-orange-500 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                {deviceStats.warning > 0 && (
                  <AITroubleshootModal
                    device={office.office}
                    metric="office.warnings.count"
                    value={`${deviceStats.warning} warning devices`}
                    suggestion="Analyze warning conditions and device issues"
                    severity="warn"
                  >
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                      <Bot className="h-3 w-3 mr-1" />
                      AI Fix
                    </Button>
                  </AITroubleshootModal>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Critical Issues</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">{deviceStats.critical}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-3 bg-red-500 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                {deviceStats.critical > 0 && (
                  <AITroubleshootModal
                    device={office.office}
                    metric="office.critical.count"
                    value={`${deviceStats.critical} critical devices`}
                    suggestion="Analyze critical issues and device failures"
                    severity="error"
                  >
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                      <Bot className="h-3 w-3 mr-1" />
                      AI Fix
                    </Button>
                  </AITroubleshootModal>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Devices ({devices.length})
          </TabsTrigger>
          <TabsTrigger value="architecture" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Architecture
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Device Distribution Pie Chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Device Distribution
                </CardTitle>
                <CardDescription>Breakdown by device type</CardDescription>
              </CardHeader>
              <CardContent>
                <DeviceDistributionPieChart />
                <div className="mt-4 space-y-2">
                  {[
                    { label: 'Routers', value: deviceStats.routers, color: '#3B82F6', icon: Wifi },
                    { label: 'Switches', value: deviceStats.switches, color: '#10B981', icon: Server },
                    { label: 'PCs', value: deviceStats.pcs, color: '#F59E0B', icon: Monitor },
                    { label: 'Other', value: deviceStats.other, color: '#8B5CF6', icon: HardDrive }
                  ].filter(item => item.value > 0).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Office Information & Contact */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-green-600" />
                  Office Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {editing ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="office">Office Name</Label>
                      <Input
                        id="office"
                        value={editForm.office || ''}
                        onChange={(e) => setEditForm({ ...editForm, office: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={editForm.status || 'active'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="person">Contact Person</Label>
                      <Input
                        id="person"
                        value={editForm.contact_info?.person || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          contact_info: { ...editForm.contact_info, person: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.contact_info?.email || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          contact_info: { ...editForm.contact_info, email: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editForm.contact_info?.phone || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          contact_info: { ...editForm.contact_info, phone: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={editForm.contact_info?.address || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          contact_info: { ...editForm.contact_info, address: e.target.value }
                        })}
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm font-medium">Name</span>
                        <span className="text-sm font-semibold">{office.office}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm font-medium">Status</span>
                        {getStatusBadge(office.status)}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm font-medium">Location</span>
                        <span className="text-sm font-semibold">{office.city}, {office.country}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm font-medium">Devices</span>
                        <span className="text-sm font-semibold">{deviceStats.total}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{office.contact_info.person || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{office.contact_info.email || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{office.contact_info.phone || 'Not specified'}</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm">{office.contact_info.address || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {office.description && !editing && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Description</span>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{office.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Location Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Coordinates</span>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    {office.geo.lat.toFixed(6)}, {office.geo.lon.toFixed(6)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Source</span>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1 capitalize">{office.geo.source}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Last Updated</span>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    {new Date(office.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {/* Comprehensive Health Dashboard */}
          <div className="relative">
            <HealthDashboard 
              devices={devices} 
              officeName={`${office.office} Site Health`}
            />
            {/* AI Troubleshoot Button for Office Health */}
            <div className="absolute top-4 right-4">
              <AITroubleshootModal
                device={office.office}
                metric="office.health.overall"
                value={`${officeHealthScore}% health score`}
                suggestion="Analyze overall office health and device performance"
                severity={officeHealthStatus === 'critical' ? 'error' : officeHealthStatus === 'warning' ? 'warn' : 'info'}
              >
                <Button variant="outline" size="sm" className="flex items-center gap-2 bg-white/90 hover:bg-white shadow-lg">
                  <Bot className="h-4 w-4" />
                  AI Health Analysis
                </Button>
              </AITroubleshootModal>
            </div>
          </div>
          
          {/* Individual Device Health Monitors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Individual Device Health Monitors
              </CardTitle>
              <CardDescription>
                Detailed health analysis for each device with SNMP metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {devices.map((device) => (
                  <DeviceHealthMonitor
                    key={device.hostid}
                    deviceId={device.device_id}
                    hostid={device.hostid}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Health Metrics Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Health Metrics Summary
              </CardTitle>
              <CardDescription>
                Comprehensive health monitoring based on SNMP metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">CPU Monitoring</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Tracks processor utilization, load averages, and performance metrics to identify bottlenecks and overload conditions.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MemoryStick className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-100">Memory Health</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Monitors RAM usage, buffer memory, and storage utilization to prevent memory-related failures.
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-purple-900 dark:text-purple-100">Interface Monitoring</span>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Tracks interface status, traffic patterns, and error rates to detect network issues and capacity problems.
                  </p>
                </div>
                
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-orange-900 dark:text-orange-100">Environmental</span>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Monitors temperature, fan status, and power conditions to prevent hardware failures from overheating.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-blue-600" />
                    Connected Devices
                  </CardTitle>
                  <CardDescription>
                    Network devices associated with this office
                  </CardDescription>
                </div>
                <AITroubleshootModal
                  device={office.office}
                  metric="office.devices.status"
                  value={`${deviceStats.online} online, ${deviceStats.offline} offline, ${deviceStats.critical} critical`}
                  suggestion="Analyze device connectivity and health issues"
                  severity={deviceStats.critical > 0 ? "error" : deviceStats.offline > 0 ? "warn" : "info"}
                >
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Device Analysis
                  </Button>
                </AITroubleshootModal>
              </div>
            </CardHeader>
            <CardContent>
              {devices.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {devices.map((device) => (
                    <div key={device.hostid} className="relative">
                      <Link href={`/devices/${device.hostid}`}>
                        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 cursor-pointer">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              {getDeviceIcon(device.device_id)}
                              {device.device_id}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {getDeviceStatusBadge(device.status, device.severity)}
                              {/* AI Troubleshoot Button for devices with issues */}
                              {(device.severity === 'critical' || device.severity === 'warning' || device.status === 'Down') && (
                                <AITroubleshootModal
                                  device={device.device_id}
                                  metric={`device.${device.device_id}.status`}
                                  value={device.status}
                                  suggestion={`Device ${device.device_id} has issues - check connectivity and performance`}
                                  severity={device.severity === 'critical' ? 'error' : 'warn'}
                                >
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-6 px-2 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Bot className="h-3 w-3 mr-1" />
                                    AI Fix
                                  </Button>
                                </AITroubleshootModal>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Host ID:</span>
                              <span className="font-mono">{device.hostid}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Interfaces:</span>
                              <span className="font-semibold">{device.interface_count || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Metrics:</span>
                              <span className="font-semibold">{device.total_metrics || 0}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">
                                Last seen: {new Date(device.last_seen).toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                  <p className="text-muted-foreground">
                    No devices are currently associated with this office.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-green-600" />
                    Network Architecture
                  </CardTitle>
                  <CardDescription>
                    Visual representation of the office network topology
                  </CardDescription>
                </div>
                <AITroubleshootModal
                  device={office.office}
                  metric="network.architecture.analysis"
                  value={`${deviceStats.total} devices, ${deviceStats.online} online`}
                  suggestion="Analyze network architecture and connectivity issues"
                  severity="info"
                >
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Network Analysis
                  </Button>
                </AITroubleshootModal>
              </div>
            </CardHeader>
            <CardContent>
              <NetworkArchitecture />
            </CardContent>
          </Card>

          {/* Network Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Routers</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{deviceStats.routers}</p>
                  </div>
                  <Wifi className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Switches</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{deviceStats.switches}</p>
                  </div>
                  <Server className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">PCs</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{deviceStats.pcs}</p>
                  </div>
                  <Monitor className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Other</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{deviceStats.other}</p>
                  </div>
                  <HardDrive className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  Office Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Created</span>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(office.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Last Updated</span>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(office.updated_at).toLocaleString()}
                  </p>
                </div>
                {editing && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        value={editForm.contact_info?.capacity || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          contact_info: { ...editForm.contact_info, capacity: e.target.value }
                        })}
                        placeholder="e.g., 50 employees"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={editForm.contact_info?.notes || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          contact_info: { ...editForm.contact_info, notes: e.target.value }
                        })}
                        rows={3}
                        placeholder="Additional notes about this office..."
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Office Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Devices</span>
                      <Server className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{deviceStats.total}</p>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">Online Devices</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{deviceStats.online}</p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-900 dark:text-orange-100">Warning Devices</span>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{deviceStats.warning}</p>
                  </div>
                  
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-900 dark:text-red-100">Critical Devices</span>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">{deviceStats.critical}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
