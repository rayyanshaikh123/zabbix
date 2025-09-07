import { BackButton } from '@/components/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Wifi, Server, Monitor, Activity, Settings, Network, HardDrive, Cpu, MemoryStick, Clock, MapPin, Thermometer, Zap, Fan, Database, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogPanel } from '@/components/log-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocationDisplay } from '@/components/location-display';
import { DeviceHealthMonitor } from '@/components/device-health-monitor';
import { CircularHealthChart } from '@/components/circular-health-chart';

interface DeviceInfo {
  hostid: string;
  device_id: string;
  device_name: string;
  device_type: string;
  location: string;
  geo?: {
    lat: number;
    lon: number;
    source: string;
  };
  system_info: {
    os_version?: string;
    system_description?: string;
    system_contact?: string;
    system_location?: string;
    system_name?: string;
    hardware_model?: string;
    hardware_serial?: string;
    uptime_hardware?: number;
    uptime_network?: number;
  };
  interfaces: {
    [interfaceName: string]: {
      name: string;
      status: string;
      speed?: number;
      duplex?: string;
      traffic: {
        bits_received?: number;
        bits_sent?: number;
        packets_received?: number;
        packets_sent?: number;
        errors_in?: number;
        errors_out?: number;
        discarded_in?: number;
        discarded_out?: number;
      };
      last_seen: Date;
    };
  };
  system_metrics: {
    memory: {
      free?: number;
      used?: number;
      utilization?: number;
    };
    cpu: {
      utilization?: number;
    };
    hardware: {
      fan_status?: string;
      power_status?: string;
      temperature?: number;
      temperature_status?: string;
    };
    snmp: {
      agent_availability?: string;
      traps?: number;
    };
  };
  last_seen: Date;
}

// Fetch device data from API
async function getDeviceData(hostid: string): Promise<{ device: DeviceInfo; alerts: any[]; rawMetrics?: any[] } & { error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/devices/${hostid}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    
    // Also fetch raw metrics for the Raw Metrics tab
    try {
      const metricsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/metrics/${hostid}`, {
        next: { revalidate: 30 },
      });
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        data.rawMetrics = metricsData.metrics || [];
      }
    } catch (metricsError) {
      console.warn('Could not fetch raw metrics:', metricsError);
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching device ${hostid} details:`, error);
    return { 
      device: {
        hostid, device_id: 'Unknown', device_name: 'Unknown', device_type: 'Unknown',
        location: 'Unknown', system_info: {}, interfaces: {}, system_metrics: { memory: {}, cpu: {}, hardware: {}, snmp: {} },
        last_seen: new Date(0)
      },
      alerts: [],
      rawMetrics: [],
      error: error instanceof Error ? error.message : 'Failed to fetch device details' 
    };
  }
}

function getStatusBadge(status: string, severity: string) {
  if (severity === 'critical' || status === 'down') {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
  }
  if (severity === 'warning') {
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Warning</Badge>;
  }
  return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Operational</Badge>;
}

function getInterfaceStatusBadge(status: 'up' | 'down' | 'unknown') {
  if (status === 'up') {
    return <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3" />Up</Badge>;
  }
  if (status === 'down') {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Down</Badge>;
  }
  return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Unknown</Badge>;
}

export default async function DeviceDetailsPage({ params }: { params: Promise<{ hostid: string }> }) {
  const { hostid } = await params;
  const deviceData = await getDeviceData(hostid);

  const hasConnectionError = deviceData.error;

  if (hasConnectionError) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <header className="mb-6">
          <BackButton />
          <h1 className="text-2xl font-semibold text-balance mt-4">Device Details</h1>
          <p className="text-sm text-muted-foreground">Host ID: {hostid}</p>
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Database Connection Issue</h3>
            <p className="text-red-600 text-sm mt-1">
              {deviceData.error}
            </p>
            <p className="text-red-600 text-sm mt-2">
              Make sure MongoDB is configured correctly and the monitoring agent is running.
            </p>
          </div>
        </header>
      </main>
    );
  }

  const { device, alerts, rawMetrics = [] } = deviceData;
  const { device_id, device_name, device_type, location, geo, system_info, interfaces, system_metrics, last_seen } = device;

  const interfaceList = interfaces ? Object.values(interfaces) : [];
  const upInterfaces = interfaceList.filter(iface => iface.status === 'Up').length;
  const downInterfaces = interfaceList.filter(iface => iface.status === 'Down').length;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <BackButton />
        <h1 className="text-2xl font-semibold text-balance mt-4">{device_name} Details</h1>
        <p className="text-sm text-muted-foreground">
          {device_type} • {geo ? (
            <LocationDisplay 
              lat={geo.lat} 
              lon={geo.lon} 
              inline={true}
            />
          ) : location} • Last seen: {new Date(last_seen).toLocaleString()}
        </p>
        {geo && (
          <LocationDisplay 
            lat={geo.lat} 
            lon={geo.lon} 
            source={geo.source}
            className="mt-2"
          />
        )}
      </header>

      {/* Device Overview Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interfaces</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interfaceList.length}</div>
            <p className="text-xs text-muted-foreground">Monitored interfaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interface Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{upInterfaces} Up</div>
            <p className="text-xs text-muted-foreground">{downInterfaces} Down</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Utilization</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {system_metrics?.cpu?.utilization ? `${system_metrics.cpu.utilization.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Current CPU usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {system_metrics?.memory?.utilization ? `${system_metrics.memory.utilization.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Memory utilization</p>
          </CardContent>
        </Card>
      </section>

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
          <TabsTrigger value="metrics">Raw Metrics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">OS Version:</span>
                    <span className="text-sm text-muted-foreground">{system_info?.os_version || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Hardware Model:</span>
                    <span className="text-sm text-muted-foreground">{system_info?.hardware_model || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Serial Number:</span>
                    <span className="text-sm text-muted-foreground">{system_info?.hardware_serial || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">System Name:</span>
                    <span className="text-sm text-muted-foreground">{system_info?.system_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Contact:</span>
                    <span className="text-sm text-muted-foreground">{system_info?.system_contact || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hardware Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Hardware Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Fan Status:</span>
                    <Badge variant={system_metrics?.hardware?.fan_status === 'Normal' ? 'default' : 'destructive'}>
                      {system_metrics?.hardware?.fan_status || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Power Status:</span>
                    <Badge variant={system_metrics?.hardware?.power_status === 'Normal' ? 'default' : 'destructive'}>
                      {system_metrics?.hardware?.power_status || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Temperature:</span>
                    <span className="text-sm text-muted-foreground">
                      {system_metrics?.hardware?.temperature ? `${system_metrics.hardware.temperature}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">SNMP Agent:</span>
                    <Badge variant={system_metrics?.snmp?.agent_availability === 'Available' ? 'default' : 'destructive'}>
                      {system_metrics?.snmp?.agent_availability || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <div className="space-y-6">
            {/* Device Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Device Health Overview
                </CardTitle>
                <CardDescription>
                  Comprehensive health monitoring for {device_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <CircularHealthChart 
                    healthScore={85} // This should be calculated based on actual device metrics
                    status="good"
                    size="xl"
                    showDetails={true}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Detailed Health Monitoring */}
            <DeviceHealthMonitor
              deviceId={device_id}
              hostid={hostid}
            />
          </div>
        </TabsContent>

        <TabsContent value="interfaces" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Interfaces</CardTitle>
              <CardDescription>Detailed status and traffic information for each interface.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interfaceList.length > 0 ? (
                  interfaceList.map((iface, index) => (
                    <div key={index} className="border p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-blue-500" />
                          <h3 className="font-medium">{iface.name}</h3>
                          <Badge variant={iface.status === 'Up' ? 'default' : 'destructive'}>
                            {iface.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Last seen: {new Date(iface.last_seen).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Interface Details</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Speed:</span>
                              <span>{iface.speed ? `${(iface.speed / 1000000).toFixed(0)} Mbps` : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duplex:</span>
                              <span>{iface.duplex || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Traffic Statistics</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Bits Received:</span>
                              <span>{iface.traffic.bits_received?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Bits Sent:</span>
                              <span>{iface.traffic.bits_sent?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Errors In:</span>
                              <span className={iface.traffic.errors_in ? 'text-red-600' : ''}>
                                {iface.traffic.errors_in || '0'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Errors Out:</span>
                              <span className={iface.traffic.errors_out ? 'text-red-600' : ''}>
                                {iface.traffic.errors_out || '0'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No interfaces found for this device.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Memory Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="h-5 w-5" />
                  Memory Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {system_metrics?.memory?.utilization && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Utilization</span>
                        <span>{system_metrics.memory.utilization.toFixed(1)}%</span>
                      </div>
                      <Progress value={system_metrics.memory.utilization} className="h-2" />
                    </div>
                  )}
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Free Memory:</span>
                      <span>{system_metrics?.memory?.free ? `${(system_metrics.memory.free / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Used Memory:</span>
                      <span>{system_metrics?.memory?.used ? `${(system_metrics.memory.used / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Uptime Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Uptime Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Hardware Uptime:</span>
                      <span>{system_info?.uptime_hardware ? `${system_info.uptime_hardware} seconds` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network Uptime:</span>
                      <span>{system_info?.uptime_network ? `${system_info.uptime_network} seconds` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Raw Metrics Data
              </CardTitle>
              <CardDescription>
                All metrics collected from the device ({rawMetrics.length} total metrics)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {rawMetrics.length > 0 ? (
                    rawMetrics.map((metric, index) => (
                      <div key={index} className="border p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{metric.metric}</h4>
                          <Badge variant="outline" className="text-xs">
                            {metric.value_type || 'gauge'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Value:</span>
                            <span className="ml-2 text-muted-foreground">{metric.value}</span>
                          </div>
                          <div>
                            <span className="font-medium">Timestamp:</span>
                            <span className="ml-2 text-muted-foreground">
                              {metric.ts ? new Date(metric.ts * 1000).toLocaleString() : 'Invalid Date'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Interface:</span>
                            <span className="ml-2 text-muted-foreground">
                              {metric.meta?.ifdescr || 'System'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Location:</span>
                            <span className="ml-2 text-muted-foreground">
                              {metric.meta?.location || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        {metric.meta?.geo && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Coordinates:</span>
                            <span className="ml-2 text-muted-foreground">
                              {metric.meta.geo.lat}, {metric.meta.geo.lon} ({metric.meta.geo.source})
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No raw metrics data available.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogPanel deviceFilter={device_id} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
