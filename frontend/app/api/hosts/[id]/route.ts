import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface InterfaceInfo {
  ifindex: string | null;
  ifdescr: string | null;
  last_seen: Date;
  metrics_count: number;
}

interface HostDetails {
  hostid: string;
  device_id: string;
  last_seen: Date;
  interfaces: InterfaceInfo[];
  total_metrics: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hostid = params.id;
    const metricsCollection = await getCollection('metrics_ts');

    // Get host basic info
    const hostInfo = await metricsCollection.aggregate([
      {
        $match: {
          'meta.hostid': hostid
        }
      },
      {
        $group: {
          _id: {
            hostid: '$meta.hostid',
            device_id: '$meta.device_id'
          },
          last_seen: { $max: '$ts' },
          total_metrics: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id.hostid',
          device_id: '$_id.device_id',
          last_seen: 1,
          total_metrics: 1
        }
      }
    ]).toArray();

    if (hostInfo.length === 0) {
      return NextResponse.json(
        { error: 'Host not found' },
        { status: 404 }
      );
    }

    // Get interfaces for this host
    const interfaces = await metricsCollection.aggregate([
      {
        $match: {
          'meta.hostid': hostid
        }
      },
      {
        $group: {
          _id: {
            ifindex: '$meta.ifindex',
            ifdescr: '$meta.ifdescr'
          },
          last_seen: { $max: '$ts' },
          metrics_count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          ifindex: '$_id.ifindex',
          ifdescr: '$_id.ifdescr',
          last_seen: 1,
          metrics_count: 1
        }
      },
      {
        $sort: { last_seen: -1 }
      }
    ]).toArray();

    const hostDetails: HostDetails = {
      ...hostInfo[0],
      interfaces: interfaces
    };

    return NextResponse.json(hostDetails);

  } catch (error) {
    console.error('Error fetching host details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch host details' },
      { status: 500 }
    );
  }
}
