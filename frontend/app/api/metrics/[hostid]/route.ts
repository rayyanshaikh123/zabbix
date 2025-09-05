import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

export async function GET(
  request: NextRequest,
  { params }: { params: { hostid: string } }
) {
  try {
    const hostid = params.hostid;
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000); // Max 1000
    const metric = searchParams.get('metric'); // Optional metric filter

    const metricsCollection = await getCollection('metrics_ts');

    // Build query
    const query: any = {
      'meta.hostid': hostid
    };

    if (metric) {
      query.metric = metric;
    }

    // Get latest metrics
    const metrics = await metricsCollection
      .find(query)
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();

    // Convert MongoDB documents to plain objects and timestamps to numbers
    const formattedMetrics = metrics.map(doc => ({
      ...doc,
      _id: doc._id.toString(),
      ts: Math.floor(doc.ts.getTime() / 1000) // Convert Date to Unix timestamp
    }));

    return NextResponse.json({
      count: formattedMetrics.length,
      hostid: hostid,
      metric_filter: metric,
      limit: limit,
      data: formattedMetrics
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
