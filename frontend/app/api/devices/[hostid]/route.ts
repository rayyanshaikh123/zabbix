import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';
import { analyzeInterfaceStatus, categorizeDeviceType } from '@/lib/location-utils';

interface DeviceDetails {
  hostid: string;
  device_id: string;
  last_seen: Date;
  total_interfaces: number;
  interfaces: {
    iface: string;
    ifdescr: string;
    status: 'up' | 'down' | 'unknown';
    last_seen: Date;
    metrics: any[]; // Raw metrics for the interface
    troubleshooting: {
      issues: string[];
      suggestions: string[];
    };
  }[];
  alerts: any[];
  metrics_summary: any[];
}

export async function GET(request: NextRequest, { params }: { params: { hostid: string } }) {
  try {
    const { hostid } = params;

    const metricsCollection = await getCollection('metrics_ts');
    const eventsCollection = await getCollection('events');

    // 1. Get all metrics for the specific host
    const deviceMetrics = await metricsCollection.find({
      'meta.hostid': hostid,
      'meta.device_id': { $not: { $regex: /zabbix|server/i } }
    }).sort({ ts: -1 }).toArray();

    // 2. Get all alerts for the specific host
    const deviceAlerts = await eventsCollection.find({
      hostid: hostid,
      device_id: { $not: { $regex: /zabbix|server/i } }
    }).sort({ detected_at: -1 }).toArray();

    // 3. Aggregate interfaces and their latest status/metrics
    const interfacesMap = new Map<string, any>();

    deviceMetrics.forEach(metric => {
      const ifaceKey = metric.meta.ifdescr || metric.meta.ifindex || '_global';
      if (!interfacesMap.has(ifaceKey)) {
        interfacesMap.set(ifaceKey, {
          iface: metric.meta.ifindex || '_global',
          ifdescr: metric.meta.ifdescr || 'Global',
          status: 'unknown',
          last_seen: new Date(0),
          metrics: []
        });
      }

      const ifaceData = interfacesMap.get(ifaceKey);
      ifaceData.metrics.push(metric);

      // Update last seen for interface
      if (new Date(metric.ts * 1000) > ifaceData.last_seen) {
        ifaceData.last_seen = new Date(metric.ts * 1000);
      }

      // Determine operational status
      if (metric.metric.includes('Operational status') && typeof metric.value === 'number') {
        ifaceData.status = metric.value === 1 ? 'up' : 'down';
      }
    });

    const interfaces = Array.from(interfacesMap.values()).map(ifaceData => {
      const latestOperationalStatusMetric = ifaceData.metrics.find((m: any) => m.metric.includes('Operational status'));
      const currentStatus = latestOperationalStatusMetric ? (latestOperationalStatusMetric.value === 1 ? 'up' : 'down') : 'unknown';

      const troubleshooting = analyzeInterfaceStatus({
        interface: ifaceData.ifdescr,
        status: currentStatus,
        // Add more data if available, e.g., utilization, errors, packetLoss
      });

      return {
        iface: ifaceData.iface,
        ifdescr: ifaceData.ifdescr,
        status: currentStatus,
        last_seen: ifaceData.last_seen,
        metrics: ifaceData.metrics.slice(0, 5), // Limit metrics for brevity
        troubleshooting,
      };
    });

    // Get overall device details
    const firstMetric = deviceMetrics[0];
    const device_id = firstMetric?.meta.device_id || 'Unknown Device';
    const last_seen = firstMetric ? new Date(firstMetric.ts * 1000) : new Date(0);

    // Prepare metrics summary (e.g., CPU, Memory, Disk if available)
    const metricsSummary = deviceMetrics.filter(m => 
      m.metric.toLowerCase().includes('cpu') || 
      m.metric.toLowerCase().includes('memory') || 
      m.metric.toLowerCase().includes('disk')
    ).slice(0, 5);

    const deviceDetails: DeviceDetails = {
      hostid,
      device_id,
      last_seen,
      total_interfaces: interfaces.length,
      interfaces,
      alerts: deviceAlerts.slice(0, 10), // Limit alerts for brevity
      metrics_summary: metricsSummary,
    };

    return NextResponse.json(deviceDetails);

  } catch (error) {
    console.error(`Error fetching device details for host ${params.hostid}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch device details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
