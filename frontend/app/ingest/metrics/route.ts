import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface MetricDocument {
  ts: number;
  meta: {
    device_id: string;
    hostid: string;
    ifindex?: string;
    ifdescr?: string;
    geo?: any;
  };
  metric: string;
  value: any;
  value_type?: string;
}

export async function POST(request: NextRequest) {
  try {
    const metrics: MetricDocument[] = await request.json();

    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Expected array of metrics' },
        { status: 400 }
      );
    }

    const collection = await getCollection('metrics_ts');

    // Convert timestamps to Date objects for MongoDB time series
    const docs = metrics.map(metric => ({
      ...metric,
      ts: new Date(metric.ts * 1000) // Convert Unix timestamp to Date
    }));

    const result = await collection.insertMany(docs);

    return NextResponse.json({
      inserted: result.insertedCount
    }, { status: 201 });

  } catch (error) {
    console.error('Error ingesting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to ingest metrics' },
      { status: 500 }
    );
  }
}
