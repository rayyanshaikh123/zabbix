import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface Host {
  hostid: string;
  device_id: string;
  last_seen?: Date;
  interface_count?: number;
}

export async function GET(request: NextRequest) {
  try {
    const metricsCollection = await getCollection('metrics_ts');

    // Aggregate unique hosts with their latest activity
    const hosts = await metricsCollection.aggregate([
      {
        $group: {
          _id: {
            hostid: '$meta.hostid',
            device_id: '$meta.device_id'
          },
          last_seen: { $max: '$ts' },
          interface_count: {
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
          interface_count: { $size: '$interface_count' }
        }
      },
      {
        $sort: { last_seen: -1 }
      }
    ]).toArray();

    return NextResponse.json({
      count: hosts.length,
      hosts: hosts
    });

  } catch (error) {
    console.error('Error fetching hosts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hosts' },
      { status: 500 }
    );
  }
}
