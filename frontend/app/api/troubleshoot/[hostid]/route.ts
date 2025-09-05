import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

export async function GET(
  request: NextRequest,
  { params }: { params: { hostid: string } }
) {
  try {
    const hostid = params.hostid;
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

    // Convert timestamps and format data
    const formattedMetrics = metrics.map(doc => ({
      ...doc,
      _id: doc._id.toString(),
      ts: Math.floor(doc.ts.getTime() / 1000)
    }));

    const formattedAlerts = alerts.map(doc => ({
      ...doc,
      _id: doc._id.toString(),
      detected_at: Math.floor(doc.detected_at.getTime() / 1000)
    }));

    return NextResponse.json({
      hostid: hostid,
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
      }
    });

  } catch (error) {
    console.error('Error fetching troubleshoot data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch troubleshoot data' },
      { status: 500 }
    );
  }
}
