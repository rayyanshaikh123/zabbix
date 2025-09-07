import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface Metric {
  _id: string;
  ts: number;
  meta: {
    hostid: string;
    device_id: string;
    ifindex?: string;
    ifdescr?: string;
  };
  metric: string;
  value: number;
  value_type: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // Max 1000
    const metric = searchParams.get('metric'); // Optional metric filter
    const hostid = searchParams.get('hostid'); // Optional host filter

    const metricsCollection = await getCollection('metrics_ts');

    // Build query - exclude Zabbix server by default
    const query: any = {
      'meta.device_id': { 
        $not: { $regex: /zabbix|server/i } 
      }
    };

    if (metric) {
      query.metric = { $regex: metric, $options: 'i' }; // Case-insensitive partial match
    }

    if (hostid) {
      query['meta.hostid'] = hostid;
    }

    // Get latest metrics from all hosts
    const metrics = await metricsCollection
      .find(query)
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();

    // Convert MongoDB documents to plain objects and timestamps to numbers
    const formattedMetrics: Metric[] = metrics.map(doc => ({
      _id: doc._id.toString(),
      ts: Math.floor(doc.ts.getTime() / 1000), // Convert Date to Unix timestamp
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

    return NextResponse.json({
      count: formattedMetrics.length,
      filters: {
        metric: metric,
        hostid: hostid,
        limit: limit
      },
      data: formattedMetrics
    });

  } catch (error) {
    console.error('Error fetching all metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
