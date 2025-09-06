import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface Alert {
  _id: string;
  device_id: string;
  hostid: string;
  iface: string;
  metric: string;
  value: string;
  status: string;
  severity: string;
  detected_at: number;
  evidence?: any;
  labels?: any[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // Max 1000
    const severity = searchParams.get('severity'); // Optional severity filter
    const hostid = searchParams.get('hostid'); // Optional host filter
    const device_id = searchParams.get('device_id'); // Optional device filter

    const eventsCollection = await getCollection('events');

    // Build query
    const query: any = {};

    if (severity) {
      query.severity = severity;
    }

    if (hostid) {
      query.hostid = hostid;
    }

    if (device_id) {
      query.device_id = device_id;
    }

    // Get latest alerts
    const alerts = await eventsCollection
      .find(query)
      .sort({ detected_at: -1 })
      .limit(limit)
      .toArray();

    // Convert MongoDB documents to plain objects and timestamps to numbers
    const formattedAlerts: Alert[] = alerts.map(doc => ({
      _id: doc._id.toString(),
      device_id: doc.device_id,
      hostid: doc.hostid,
      iface: doc.iface,
      metric: doc.metric,
      value: doc.value,
      status: doc.status,
      severity: doc.severity,
      detected_at: Math.floor(doc.detected_at.getTime() / 1000), // Convert Date to Unix timestamp
      evidence: doc.evidence,
      labels: doc.labels
    }));

    return NextResponse.json({
      count: formattedAlerts.length,
      filters: {
        severity: severity,
        hostid: hostid,
        device_id: device_id,
        limit: limit
      },
      alerts: formattedAlerts
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
