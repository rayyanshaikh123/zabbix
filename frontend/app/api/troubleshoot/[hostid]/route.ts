import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface TroubleshootData {
  hostid: string;
  device_id: string;
  time_range: {
    start: number;
    end: number;
    hours: number;
  };
  metrics: {
    count: number;
    data: any[];
  };
  alerts: {
    count: number;
    data: any[];
  };
  summary: {
    total_metrics: number;
    total_alerts: number;
    critical_alerts: number;
    warning_alerts: number;
    last_seen: number | null;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hostid: string }> }
) {
  try {
    const { hostid } = await params;
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500 for troubleshooting
    const hours = parseInt(searchParams.get('hours') || '24'); // Last N hours

    const metricsCollection = await getCollection('metrics_ts');
    const eventsCollection = await getCollection('events');

    // Calculate time range
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

    // Get recent metrics for this host
    const metrics = await metricsCollection
      .find({
        'meta.hostid': hostid,
        ts: {
          $gte: startTime,
          $lte: endTime
        }
      })
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();

    // Get recent alerts for this host
    const alerts = await eventsCollection
      .find({
        hostid: hostid,
        detected_at: {
          $gte: startTime,
          $lte: endTime
        }
      })
      .sort({ detected_at: -1 })
      .limit(limit)
      .toArray();

    // Get device_id from first metric or alert
    const device_id = metrics[0]?.meta?.device_id || alerts[0]?.device_id || 'Unknown';

    // Convert timestamps and format data
    const formattedMetrics = metrics.map(doc => ({
      _id: doc._id.toString(),
      ts: Math.floor(doc.ts.getTime() / 1000),
      meta: {
        hostid: doc.meta?.hostid || '',
        device_id: doc.meta?.device_id || '',
        ifindex: doc.meta?.ifindex,
        ifdescr: doc.meta?.ifdescr
      },
      metric: doc.metric,
      value: doc.value,
      value_type: doc.value_type
    }));

    const formattedAlerts = alerts.map(doc => ({
      _id: doc._id.toString(),
      device_id: doc.device_id,
      hostid: doc.hostid,
      iface: doc.iface,
      metric: doc.metric,
      value: doc.value,
      status: doc.status,
      severity: doc.severity,
      detected_at: Math.floor(doc.detected_at.getTime() / 1000),
      evidence: doc.evidence,
      labels: doc.labels
    }));

    // Calculate summary statistics
    const criticalAlerts = formattedAlerts.filter(alert => alert.severity === 'critical').length;
    const warningAlerts = formattedAlerts.filter(alert => alert.severity === 'warning').length;
    const lastSeen = formattedMetrics.length > 0 ? Math.max(...formattedMetrics.map(m => m.ts)) : null;

    const troubleshootData: TroubleshootData = {
      hostid: hostid,
      device_id: device_id,
      time_range: {
        start: Math.floor(startTime.getTime() / 1000),
        end: Math.floor(endTime.getTime() / 1000),
        hours: hours
      },
      metrics: {
        count: formattedMetrics.length,
        data: formattedMetrics
      },
      alerts: {
        count: formattedAlerts.length,
        data: formattedAlerts
      },
      summary: {
        total_metrics: formattedMetrics.length,
        total_alerts: formattedAlerts.length,
        critical_alerts: criticalAlerts,
        warning_alerts: warningAlerts,
        last_seen: lastSeen
      }
    };

    return NextResponse.json(troubleshootData);

  } catch (error) {
    console.error('Error fetching troubleshoot data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch troubleshoot data' },
      { status: 500 }
    );
  }
}
