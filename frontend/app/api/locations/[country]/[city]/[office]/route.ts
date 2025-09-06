import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';
import { analyzeInterfaceStatus, calculateDeviceDistribution } from '@/lib/location-utils';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { country: string; city: string; office: string } }
) {
  try {
    const { country, city, office } = params;
    const { searchParams } = new URL(request.url);

    const metricsCollection = await getCollection('metrics_ts');
    const eventsCollection = await getCollection('events');

    // Find devices in this specific office
    const officeDevices = await metricsCollection.aggregate([
      {
        $match: {
          'meta.location': { $regex: new RegExp(`${office}`, 'i') }
        }
      },
      {
        $group: {
          _id: {
            hostid: '$meta.hostid',
            device_id: '$meta.device_id'
          },
          last_seen: { $max: '$ts' },
          interfaces: {
            $addToSet: {
              ifindex: '$meta.ifindex',
              ifdescr: '$meta.ifdescr'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id.hostid',
          device_id: '$_id.device_id',
          last_seen: 1,
          interfaces: 1
        }
      }
    ]).toArray();

    // Get alerts for these devices
    const deviceAlerts = await eventsCollection.aggregate([
      {
        $match: {
          hostid: { $in: officeDevices.map(d => d.hostid) }
        }
      },
      {
        $group: {
          _id: '$hostid',
          latest_alert: {
            $first: {
              status: '$status',
              severity: '$severity',
              detected_at: '$detected_at'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id',
          status: '$latest_alert.status',
          severity: '$latest_alert.severity',
          last_alert: '$latest_alert.detected_at'
        }
      }
    ]).toArray();

    // Get interface-specific metrics
    const interfaceMetrics = await metricsCollection.find({
      'meta.hostid': { $in: officeDevices.map(d => d.hostid) },
      'meta.ifindex': { $exists: true, $ne: null }
    }).toArray();

    // Build device details with interface monitoring
    const devices = officeDevices.map(device => {
      const alertInfo = deviceAlerts.find(alert => alert.hostid === device.hostid);
      const deviceInterfaces = interfaceMetrics
        .filter(metric => metric.meta.hostid === device.hostid)
        .map(metric => {
          const interfaceData = {
            interface: metric.meta.ifdescr || `Interface ${metric.meta.ifindex}`,
            status: metric.value === 0 ? 'down' : 'up',
            lastSeen: metric.ts,
            value: metric.value
          };
          return analyzeInterfaceStatus(interfaceData);
        });

      return {
        hostid: device.hostid,
        device_id: device.device_id,
        status: alertInfo?.status || 'Operational',
        severity: alertInfo?.severity || 'info',
        last_seen: device.last_seen,
        deviceType: categorizeDeviceType(device.device_id),
        interfaces: deviceInterfaces
      };
    });

    // Calculate office-level statistics
    const deviceDistribution = calculateDeviceDistribution(devices);
    const healthyDevices = devices.filter(d => d.severity === 'info' || !d.severity).length;
    const warningDevices = devices.filter(d => d.severity === 'warning').length;
    const criticalDevices = devices.filter(d => d.severity === 'critical').length;

    // Interface monitoring analysis
    const allInterfaces = devices.flatMap(d => d.interfaces);
    const totalInterfaces = allInterfaces.length;
    const upInterfaces = allInterfaces.filter(i => i.status === 'up').length;
    const downInterfaces = allInterfaces.filter(i => i.status === 'down').length;
    const unknownInterfaces = allInterfaces.filter(i => i.status === 'unknown').length;
    const problematicInterfaces = allInterfaces
      .filter(i => i.issues.length > 0)
      .map(i => ({
        interface: i.interface,
        device: devices.find(d => d.interfaces.includes(i))?.device_id || 'Unknown',
        status: i.status,
        issues: i.issues,
        suggestions: i.suggestions,
        lastSeen: i.lastSeen
      }));

    const officeDetails: OfficeDetails = {
      country,
      city,
      office,
      deviceCount: devices.length,
      healthyDevices,
      warningDevices,
      criticalDevices,
      lastSeen: devices.length > 0 ? new Date(Math.max(...devices.map(d => new Date(d.last_seen).getTime()))) : null,
      deviceDistribution,
      devices,
      interfaceMonitoring: {
        totalInterfaces,
        upInterfaces,
        downInterfaces,
        unknownInterfaces,
        problematicInterfaces
      }
    };

    return NextResponse.json(officeDetails);

  } catch (error) {
    console.error('Error fetching office details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch office details' },
      { status: 500 }
    );
  }
}

function categorizeDeviceType(deviceId: string): string {
  const normalized = deviceId.toLowerCase();
  
  if (normalized.includes('switch') || normalized.includes('sw')) {
    return 'switches';
  }
  if (normalized.includes('router') || normalized.includes('rt')) {
    return 'routers';
  }
  if (normalized.includes('pc') || normalized.includes('computer') || normalized.includes('desktop') || normalized.includes('laptop')) {
    return 'pcs';
  }
  if (normalized.includes('interface') || normalized.includes('port') || normalized.includes('eth')) {
    return 'interfaces';
  }
  
  return 'other';
}
