import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface EventDocument {
  device_id: string;
  hostid?: string;
  iface?: string;
  metric: string;
  value?: any;
  status: string;
  severity?: string;
  detected_at?: number;
  evidence?: any;
  labels?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const events: EventDocument[] = await request.json();

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Expected array of events' },
        { status: 400 }
      );
    }

    const collection = await getCollection('events');

    // Convert timestamps to Date objects
    const docs = events.map(event => ({
      ...event,
      detected_at: new Date((event.detected_at || Date.now() / 1000) * 1000)
    }));

    const result = await collection.insertMany(docs);

    return NextResponse.json({
      inserted: result.insertedCount
    }, { status: 201 });

  } catch (error) {
    console.error('Error ingesting events:', error);
    return NextResponse.json(
      { error: 'Failed to ingest events' },
      { status: 500 }
    );
  }
}
