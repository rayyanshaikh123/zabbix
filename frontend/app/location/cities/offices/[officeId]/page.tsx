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
  device_ids?: string[]
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
  interfaces?: DynamicInterface[]
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

// Types for dynamic network view
interface DynamicInterface {
  name?: string;
  ifindex?: number;
  ifdescr?: string;
  status?: string;
  connected_to?: string;
  connected_interface?: string;
}
interface DynamicDevice {
  device_id: string;
  hostid?: string;
  interfaces?: DynamicInterface[];
  connections?: any[];
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

  // Helper: robust matching of a device to an office based on location strings
  const deviceBelongsToOffice = (device: any, officeObj: Office | null): boolean => {
    if (!device || !officeObj) return false
    const normalize = (val?: string) => (val || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

    const deviceLocation = normalize(device.location)

    const candidatesRaw = [
      officeObj.office,
      officeObj._id,
      officeObj.city,
      `${officeObj.city}-${officeObj.office}`,
      `${officeObj.country}-${officeObj.city}-${officeObj.office}`,
    ]
    const candidates = candidatesRaw.map(normalize).filter(Boolean)

    return candidates.some((c) => deviceLocation === c || deviceLocation.includes(c))
  }

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
        // Prefer explicit mapping by device_ids when provided
        const norm = (v: any) => (v ?? '').toString().toLowerCase()
        const extractIdCandidates = (x: any): string[] => {
          if (x == null) return []
          const value = typeof x === 'object' ? [x.hostid, x.device_id, x.name, x.id, x._id] : [x]
          return value.filter(Boolean).map(norm)
        }
        const explicitDevices: any[] = Array.isArray(office?.device_ids) && office!.device_ids!.length > 0
          ? data.hosts.filter((d: any) => {
              const hostCandidates = [d.hostid, d.device_id, d.name].filter(Boolean).map(norm)
              const officeIdPool = office!.device_ids!.flatMap(extractIdCandidates)
              return officeIdPool.some((oid) => hostCandidates.includes(oid))
            })
          : []

        // Fallback: robust location-based match
        const inferredDevices = data.hosts.filter((device: any) => deviceBelongsToOffice(device, office))

        // Merge and dedupe by hostid
        const merged = [...explicitDevices, ...inferredDevices]
        const seen = new Set<string>()
        const officeDevices = merged.filter((d: any) => {
          const key = (d.hostid ?? d.device_id)?.toString()
          if (!key) return false
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
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
    // Use the devices state populated from /api/hosts/all
    // Split devices by type for topology
    const routerDevices = devices.filter(d => d.device_id.toLowerCase().includes('router') || d.device_id.toLowerCase().includes('r1'))
    const switchDevices = devices.filter(d => d.device_id.toLowerCase().includes('switch') || d.device_id.toLowerCase().includes('s1'))
    const endDevices = devices.filter(d => !routerDevices.includes(d) && !switchDevices.includes(d))

    return (
      <div className="glass-panel p-6" style={{ ['--glass-radius' as any]: '8px' }}>
        {/* Zabbix Server */}
        <div className="flex justify-center">
          <div className="glass-panel px-6 py-3 text-slate-100" style={{ ['--glass-radius' as any]: '8px' }}>
            <div className="flex items-center gap-2">
              <Server className="h-6 w-6 text-slate-200" />
              <div className="text-center">
                <div className="font-medium text-lg">Zabbix Server</div>
                <div className="text-sm text-slate-300">{zabbixServer ? zabbixServer.hostname || zabbixServer.name : 'Monitoring Server'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Link to Core Routers (Fa0/0) */}
        <div className="flex justify-center my-4">
          <div className="relative flex flex-col items-center">
            <div className="w-1 h-12 bg-green-500/80 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            <span className="mt-1 text-xs font-mono text-slate-300">Fa0/0</span>
          </div>
        </div>

        {/* Core Routers */}
        <div className="flex justify-center gap-4 flex-wrap">
          {routerDevices.length === 0 ? (
            <div className="glass-panel px-5 py-3 text-slate-100" style={{ ['--glass-radius' as any]: '8px' }}>
              <div className="flex items-center gap-2"><Wifi className="h-5 w-5" /><span>No Routers</span></div>
            </div>
          ) : routerDevices.map((r) => (
            <div key={r.hostid} className="glass-panel px-5 py-3 text-slate-100 flex flex-col items-center gap-2" style={{ ['--glass-radius' as any]: '8px' }}>
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                <div className="text-sm">{r.device_id}</div>
                <Badge className="ml-2">{r.interface_count || 0}</Badge>
              </div>
              {/* Dynamic interface badges and cables under router */}
              <div className="flex flex-wrap gap-2 mt-2">
                {(r.interfaces ?? []).map((iface: DynamicInterface, idx: number) => {
                  let color = 'bg-gray-500';
                  if (iface.status === 'Up') color = 'bg-green-500';
                  else if (iface.status === 'Down') color = 'bg-red-500';
                  else if (iface.status === 'Idle') color = 'bg-blue-500';
                  else if (iface.status === 'Unknown') color = 'bg-gray-500';
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <div className={`w-8 h-1 rounded-full ${color}`} />
                      <span className="text-slate-300 font-mono">{iface.name || iface.ifdescr || `if${iface.ifindex}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Links to Switches (Fa0/1 cables) */}
        <div className="flex justify-center my-4 gap-6">
          {switchDevices.length > 0 ? (
            switchDevices.map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-1 bg-green-500/80 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="mt-1 text-[10px] font-mono text-slate-300">Fa0/1</span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-1 bg-green-500/80 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="mt-1 text-[10px] font-mono text-slate-300">Fa0/1</span>
            </div>
          )}
        </div>

        {/* Distribution Switches */}
        {switchDevices.length > 0 && (
          <div className="flex justify-center gap-4 flex-wrap">
            {switchDevices.map((s) => (
              <div key={s.hostid} className="glass-panel px-5 py-3 text-slate-100 flex items-center gap-2" style={{ ['--glass-radius' as any]: '8px' }}>
                <Server className="h-5 w-5" />
                <div className="text-sm">{s.device_id}</div>
                <Badge className="ml-2">{s.interface_count || 0}</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Links to End Devices */}
        {endDevices.length > 0 && (
          <div className="flex justify-center my-4 gap-6">
            {endDevices.map((_, i) => (
              <div key={i} className="w-10 h-1 bg-white/15 rounded-full" />
            ))}
          </div>
        )}

        {/* Access Layer - End Devices */}
        {endDevices.length > 0 && (
          <div className="flex justify-center gap-4 flex-wrap">
            {endDevices.map((d) => (
              <div key={d.hostid} className="glass-panel px-4 py-2 text-slate-100 flex items-center gap-2" style={{ ['--glass-radius' as any]: '8px' }}>
                <Monitor className="h-4 w-4" />
                <div className="text-sm">{d.device_id}</div>
              </div>
            ))}
          </div>
        )}

        {/* Legend & Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-4" style={{ ['--glass-radius' as any]: '8px' }}>
            <h3 className="font-semibold text-slate-100 mb-3 text-center">Interface Status Legend</h3>
            <div className="flex justify-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-green-500 rounded-full" />Up</div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-red-500 rounded-full" />Down</div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-blue-500 rounded-full" />Idle</div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-gray-500 rounded-full" />Unknown</div>
            </div>
          </div>
          <div className="glass-panel p-4" style={{ ['--glass-radius' as any]: '8px' }}>
            <h3 className="font-semibold text-slate-100 mb-3 text-center">Network Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-300">
              <div className="text-center"><div className="font-medium">Total Devices</div><div className="text-2xl font-bold text-slate-100">{deviceStats.total}</div></div>
              <div className="text-center"><div className="font-medium">Routers</div><div className="text-2xl font-bold text-slate-100">{routerDevices.length}</div></div>
              <div className="text-center"><div className="font-medium">Switches</div><div className="text-2xl font-bold text-slate-100">{switchDevices.length}</div></div>
              <div className="text-center"><div className="font-medium">End Devices</div><div className="text-2xl font-bold text-slate-100">{endDevices.length}</div></div>
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

  const pageContent = (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      {/* Header Section - Glass theme */}
      <header>
        <div className="glass-panel p-6 md:p-8" style={{ ['--glass-radius' as any]: '0px' }}>
          <div className="flex items-center gap-4 mb-6">
            <BackButton />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 mb-2 text-slate-100">
                <Building className="h-7 w-7 text-slate-200" />
                {office.office}
              </h1>
              <p className="text-sm text-slate-300 mb-4">
                {office.city}, {office.country}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-slate-200">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <span className="text-sm font-semibold">{deviceStats.total} Devices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <LocationDisplay 
                      lat={office.geo.lat} 
                      lon={office.geo.lon} 
                      inline={true}
                      className="text-sm"
                    />
                  </div>
                  {getStatusBadge(office.status)}
                </div>
                {/* <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-300">Office Health</div>
                    <div className="text-[11px] text-slate-400">
                      {deviceStats.healthy} healthy • {deviceStats.warning} warning • {deviceStats.critical} critical
                    </div>
                  </div>
                  <CircularHealthChart 
                    healthScore={officeHealthScore}
                    status={officeHealthStatus}
                    size="lg"
                    showDetails={false}
                  />
                </div> */}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!editing ? (
                <>
                  <Button variant="secondary" onClick={handleEdit} className="btn-glass flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="btn-glass flex items-center gap-2">
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
                  <Button variant="outline" onClick={handleCancelEdit} className="btn-glass flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} className="btn-glass flex items-center gap-2">
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
        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Total Devices</p>
                <p className="text-3xl font-bold text-slate-100">{deviceStats.total}</p>
              </div>
              <div className="p-3 bg-blue-500/30 rounded-full">
                <Server className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Online Devices</p>
                <p className="text-3xl font-bold text-slate-100">{deviceStats.online}</p>
              </div>
              <div className="p-3 bg-green-500/30 rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Warnings</p>
                <p className="text-3xl font-bold text-slate-100">{deviceStats.warning}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-3 bg-orange-500/30 rounded-full">
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

        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Critical Issues</p>
                <p className="text-3xl font-bold text-slate-100">{deviceStats.critical}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-3 bg-red-500/30 rounded-full">
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
        <TabsList className="glass-panel grid w-full grid-cols-5" style={{ ['--glass-radius' as any]: '8px' }}>
          <TabsTrigger value="overview" className="flex items-center gap-2 text-slate-200 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2 text-slate-200 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100">
            <Activity className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2 text-slate-200 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100">
            <Server className="h-4 w-4" />
            Devices ({devices.length})
          </TabsTrigger>
          <TabsTrigger value="architecture" className="flex items-center gap-2 text-slate-200 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100">
            <Network className="h-4 w-4" />
            Architecture
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 text-slate-200 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Device Distribution Pie Chart */}
            <Card className="glass-panel lg:col-span-1" style={{ ['--glass-radius' as any]: '8px' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-slate-200" />
                  <span className="text-slate-100">Device Distribution</span>
                </CardTitle>
                <CardDescription className="text-slate-300">Breakdown by device type</CardDescription>
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
                    <div key={index} className="flex items-center justify-between text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <item.icon className="h-4 w-4 text-slate-300" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Office Information & Contact */}
            <Card className="glass-panel lg:col-span-2" style={{ ['--glass-radius' as any]: '8px' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-slate-200" />
                  <span className="text-slate-100">Office Information</span>
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
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-slate-200" />
                <span className="text-slate-100">Location Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
                  <span className="text-sm font-medium text-slate-200">Coordinates</span>
                  <p className="text-sm text-slate-300 mt-1">
                    {office.geo.lat.toFixed(6)}, {office.geo.lon.toFixed(6)}
                  </p>
                </div>
                <div className="p-4 glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
                  <span className="text-sm font-medium text-slate-200">Source</span>
                  <p className="text-sm text-slate-300 mt-1 capitalize">{office.geo.source}</p>
                </div>
                <div className="p-4 glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
                  <span className="text-sm font-medium text-slate-200">Last Updated</span>
                  <p className="text-sm text-slate-300 mt-1">
                    {new Date(office.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {/* Comprehensive Health Dashboard */}
          <div className="relative glass-panel p-4" style={{ ['--glass-radius' as any]: '8px' }}>
            <HealthDashboard 
              devices={devices} 
              officeName={`${office.office} Site Health`}
            />
            {/* AI Troubleshoot Button for Office Health */}
            <div className="absolute top-9 right-43">
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
          <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-200" />
                <span className="text-slate-100">Individual Device Health Monitors</span>
              </CardTitle>
              <CardDescription>
                <span className="text-slate-300">Detailed health analysis for each device with SNMP metrics</span>
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
          <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-200" />
                <span className="text-slate-100">Health Metrics Summary</span>
              </CardTitle>
              <CardDescription>
                <span className="text-slate-300">Comprehensive health monitoring based on SNMP metrics</span>
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
          <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-slate-200" />
                    <span className="text-slate-100">Connected Devices</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300">
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
                        <Card className="glass-panel hover:shadow-lg transition-all duration-200 cursor-pointer" style={{ ['--glass-radius' as any]: '8px' }}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-100">
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
                          <CardContent className="space-y-3 text-slate-300">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Host ID:</span>
                              <span className="font-mono text-slate-200">{device.hostid}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Interfaces:</span>
                              <span className="font-semibold text-slate-200">{device.interface_count || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Metrics:</span>
                              <span className="font-semibold text-slate-200">{device.total_metrics || 0}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-xs text-slate-400">
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
                <div className="text-center py-12 text-slate-300">
                  <Server className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-slate-100">No Devices Found</h3>
                  <p className="text-slate-300">No devices are currently associated with this office.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture" className="space-y-6">
          <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-slate-200" />
                    <span className="text-slate-100">Network Architecture</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300">
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
            <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Routers</p>
                    <p className="text-2xl font-bold text-slate-100">{deviceStats.routers}</p>
                  </div>
                  <Wifi className="h-8 w-8 text-slate-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Switches</p>
                    <p className="text-2xl font-bold text-slate-100">{deviceStats.switches}</p>
                  </div>
                  <Server className="h-8 w-8 text-slate-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">PCs</p>
                    <p className="text-2xl font-bold text-slate-100">{deviceStats.pcs}</p>
                  </div>
                  <Monitor className="h-8 w-8 text-slate-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Other</p>
                    <p className="text-2xl font-bold text-slate-100">{deviceStats.other}</p>
                  </div>
                  <HardDrive className="h-8 w-8 text-slate-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
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

            <Card className="glass-panel" style={{ ['--glass-radius' as any]: '8px' }}>
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
  return pageContent
}
