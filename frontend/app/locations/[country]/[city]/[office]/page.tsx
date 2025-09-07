import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/back-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, Clock, Server, Wifi, Monitor, Activity, AlertCircle, Cable, Building2 } from "lucide-react"
import { HealthChart } from "@/components/charts/health-chart"
import { Progress } from "@/components/ui/progress"

interface OfficeDetails {
  country: string;
  city: string;
  office: string;
  deviceCount: number;
  healthyDevices: number;
  warningDevices: number;
  criticalDevices: number;
  lastSeen: Date | null;
  deviceDistribution: {
    switches: number;
    routers: number;
    pcs: number;
    interfaces: number;
    other: number;
  };
  devices: {
    hostid: string;
    device_id: string;
    status: string;
    severity: string;
    last_seen: Date;
    deviceType: string;
    interfaces: {
      name: string;
      status: string;
      lastSeen: Date;
      issues: string[];
      suggestions: string[];
    }[];
  }[];
  interfaceMonitoring: {
    totalInterfaces: number;
    upInterfaces: number;
    downInterfaces: number;
    unknownInterfaces: number;
    problematicInterfaces: {
      interface: string;
      device: string;
      status: string;
      issues: string[];
      suggestions: string[];
      lastSeen: Date;
    }[];
  };
}

async function getOfficeDetails(country: string, city: string, office: string): Promise<OfficeDetails | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/locations/${country}/${city}/${office}`,
      {
        next: { revalidate: 30 },
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Error fetching office details:', error);
    return null;
  }
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'switches':
      return <Server className="h-5 w-5" />;
    case 'routers':
      return <Wifi className="h-5 w-5" />;
    case 'pcs':
      return <Monitor className="h-5 w-5" />;
    case 'interfaces':
      return <Cable className="h-5 w-5" />;
    default:
      return <Server className="h-5 w-5" />;
  }
}

function getStatusBadge(status: string, severity: string) {
  if (severity === 'critical') {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
  }
  if (severity === 'warning') {
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Warning</Badge>;
  }
  return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Operational</Badge>;
}

function getInterfaceStatusBadge(status: string) {
  if (status === 'down') {
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Down</Badge>;
  }
  if (status === 'unknown') {
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Unknown</Badge>;
  }
  return <Badge variant="default" className="flex items-center gap-1"><Activity className="h-3 w-3" />Up</Badge>;
}

export default async function OfficePage({ 
  params 
}: { 
  params: { country: string; city: string; office: string } 
}) {
  const officeData = await getOfficeDetails(params.country, params.city, params.office);

  if (!officeData) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <header className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <BackButton />
          </div>
          <h1 className="text-2xl font-semibold">Office Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The requested office location could not be found in the monitoring system.
          </p>
        </header>
      </main>
    );
  }

  const totalDevices = Object.values(officeData.deviceDistribution).reduce((sum, count) => sum + count, 0);
  const interfaceHealthPercentage = officeData.interfaceMonitoring.totalInterfaces > 0
    ? Math.round((officeData.interfaceMonitoring.upInterfaces / officeData.interfaceMonitoring.totalInterfaces) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          {officeData.office}
        </h1>
        <p className="text-sm text-muted-foreground">
          {officeData.country} → {officeData.city} → {officeData.office}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {officeData.deviceCount} devices • {officeData.lastSeen ? `Last seen: ${new Date(officeData.lastSeen).toLocaleString()}` : 'No recent activity'}
        </p>
      </header>

      {/* Health Overview Cards */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{officeData.deviceCount}</div>
            <p className="text-xs text-muted-foreground">All device types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interface Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interfaceHealthPercentage}%</div>
            <Progress value={interfaceHealthPercentage} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {officeData.interfaceMonitoring.upInterfaces}/{officeData.interfaceMonitoring.totalInterfaces} interfaces up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {officeData.criticalDevices + officeData.interfaceMonitoring.downInterfaces}
            </div>
            <p className="text-xs text-muted-foreground">
              {officeData.criticalDevices} devices, {officeData.interfaceMonitoring.downInterfaces} interfaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{officeData.healthyDevices}</div>
            <p className="text-xs text-muted-foreground">
              {officeData.warningDevices} warnings
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Device Distribution */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
            <CardDescription>Breakdown of device types in {officeData.office}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                {Object.entries(officeData.deviceDistribution).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(type)}
                      <div>
                        <p className="font-medium capitalize">{type}</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round((count / totalDevices) * 100)}% of total
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">devices</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-64">
                <HealthChart 
                  title="Health Status" 
                  data={[
                    { name: "Healthy", value: officeData.healthyDevices },
                    { name: "Warning", value: officeData.warningDevices },
                    { name: "Critical", value: officeData.criticalDevices }
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="interfaces" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="interfaces">Interface Monitoring</TabsTrigger>
          <TabsTrigger value="devices">All Devices</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="interfaces" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Interface Monitoring</CardTitle>
              <CardDescription>
                Real-time status of all network interfaces in {officeData.office}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Interface Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{officeData.interfaceMonitoring.upInterfaces}</p>
                    <p className="text-sm text-muted-foreground">Interfaces Up</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{officeData.interfaceMonitoring.downInterfaces}</p>
                    <p className="text-sm text-muted-foreground">Interfaces Down</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">{officeData.interfaceMonitoring.unknownInterfaces}</p>
                    <p className="text-sm text-muted-foreground">Unknown Status</p>
                  </div>
                </div>

                {/* Interface List by Device */}
                <div className="space-y-4">
                  {officeData.devices.map((device) => (
                    <div key={device.hostid} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.deviceType)}
                          <div>
                            <p className="font-medium">{device.device_id}</p>
                            <p className="text-sm text-muted-foreground">
                              {device.interfaces.length} interfaces
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(device.status, device.severity)}
                      </div>
                      
                      {device.interfaces.length > 0 && (
                        <div className="space-y-2">
                          {device.interfaces.map((iface, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div>
                                <p className="text-sm font-medium">{iface.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Last seen: {new Date(iface.lastSeen).toLocaleString()}
                                </p>
                              </div>
                              {getInterfaceStatusBadge(iface.status)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>All Devices</CardTitle>
              <CardDescription>Complete list of devices in {officeData.office}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {officeData.devices.map((device) => (
                  <div key={device.hostid} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getDeviceIcon(device.deviceType)}
                      <div>
                        <p className="font-medium">{device.device_id}</p>
                        <p className="text-sm text-muted-foreground">ID: {device.hostid}</p>
                        <p className="text-xs text-muted-foreground">
                          Type: {device.deviceType} • {device.interfaces.length} interfaces
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last seen: {new Date(device.last_seen).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(device.status, device.severity)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting & Suggestions</CardTitle>
              <CardDescription>
                AI-powered analysis and recommendations for problematic interfaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              {officeData.interfaceMonitoring.problematicInterfaces.length > 0 ? (
                <div className="space-y-4">
                  {officeData.interfaceMonitoring.problematicInterfaces.map((problem, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{problem.interface}</p>
                          <p className="text-sm text-muted-foreground">Device: {problem.device}</p>
                        </div>
                        {getInterfaceStatusBadge(problem.status)}
                      </div>
                      
                      {problem.issues.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-red-600">Issues Detected:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {problem.issues.map((issue, i) => (
                              <li key={i} className="text-sm text-red-600">{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {problem.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-blue-600">Recommended Actions:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {problem.suggestions.map((suggestion, i) => (
                              <li key={i} className="text-sm text-blue-600">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Last checked: {new Date(problem.lastSeen).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-600">All Interfaces Healthy</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    No issues detected with any interfaces in this office.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}