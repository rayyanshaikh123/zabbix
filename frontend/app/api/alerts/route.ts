import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // Max 1000
    const severity = searchParams.get('severity'); // Optional severity filter
    const hostid = searchParams.get('hostid'); // Optional host filter

    const eventsCollection = await getCollection('events');

    // Build query
    const query: any = {};

    if (severity) {
      query.severity = severity;
    }

    if (hostid) {
      query.hostid = hostid;
    }

    // Get latest alerts
    const alerts = await eventsCollection
      .find(query)
      .sort({ detected_at: -1 })
      .limit(limit)
      .toArray();

    // Convert MongoDB documents to plain objects and timestamps to numbers
    const formattedAlerts = alerts.map(doc => ({
      ...doc,
      _id: doc._id.toString(),
      detected_at: Math.floor(doc.detected_at.getTime() / 1000) // Convert Date to Unix timestamp
    }));

    return NextResponse.json({
      count: formattedAlerts.length,
      filters: {
        severity: severity,
        hostid: hostid,
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
