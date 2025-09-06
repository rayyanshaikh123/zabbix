import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

interface Host {
  hostid: string;
  device_id: string;
  last_seen?: Date;
  interface_count?: number;
  status?: string;
  severity?: string;
}

export async function GET(request: NextRequest) {
  try {
    const metricsCollection = await getCollection('metrics_ts');
    const eventsCollection = await getCollection('events');

    // Get unique hosts from metrics collection
    const hostsFromMetrics = await metricsCollection.aggregate([
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
      }
    ]).toArray();

    // Get latest alert status for each host
    const hostsWithAlerts = await eventsCollection.aggregate([
      {
        $group: {
          _id: '$hostid',
          latest_alert: {
            $first: {
              status: '$status',
              severity: '$severity',
              detected_at: '$detected_at'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id',
          status: '$latest_alert.status',
          severity: '$latest_alert.severity',
          last_alert: '$latest_alert.detected_at'
        }
      }
    ]).toArray();

    // Merge hosts with their alert status
    const hosts = hostsFromMetrics.map(host => {
      const alertInfo = hostsWithAlerts.find(alert => alert.hostid === host.hostid);
      return {
        ...host,
        status: alertInfo?.status || 'Operational',
        severity: alertInfo?.severity || 'info'
      };
    });

    // Sort by last seen
    hosts.sort((a, b) => new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime());

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
