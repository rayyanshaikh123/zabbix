import { getCollection } from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";

interface Host {
  hostid: string;
  device_id: string;
  last_seen?: Date;
  location?: string;
  interface_count?: number;
  total_metrics?: number;
  status?: string;
  severity?: string;
  device_status?: 'occupied' | 'available';
}

export async function GET(request: NextRequest) {
  try {
    const metricsCollection = await getCollection('metrics_ts');
    const eventsCollection = await getCollection('events');
    const officesCollection = await getCollection('offices');

    // Get unique hosts from metrics collection, excluding Zabbix server
    const hostsFromMetrics = await metricsCollection.aggregate([
      {
        $match: {
          'meta.device_id': { 
            $not: { $regex: /zabbix|server/i } 
          }
        }
      },
      {
        $group: {
          _id: {
            hostid: '$meta.hostid',
            device_id: '$meta.device_id'
          },
          last_seen: { $max: '$ts' },
          location: { $first: '$meta.location' },
          total_metrics: { $sum: 1 },
          interface_count: {
            $addToSet: '$meta.ifindex'
          },
          device_status: { $first: '$meta.device_status' }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id.hostid',
          device_id: '$_id.device_id',
          last_seen: 1,
          location: 1,
          total_metrics: 1,
          interface_count: { 
            $size: {
              $filter: {
                input: '$interface_count',
                cond: { $ne: ['$$this', null] }
              }
            }
          },
          device_status: { $ifNull: ['$device_status', 'available'] }
        }
      }
    ]).toArray();

    // Get all assigned device IDs from offices to determine device status
    const assignedDevices = await officesCollection.aggregate([
      {
        $unwind: {
          path: "$device_ids",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          assigned_device_ids: { $addToSet: "$device_ids" }
        }
      }
    ]).toArray();

    const assignedDeviceIds = assignedDevices.length > 0 ? assignedDevices[0].assigned_device_ids : [];

    // Get latest alert status for each host
    const hostsWithAlerts = await eventsCollection.aggregate([
      {
        $match: {
          device_id: { 
            $not: { $regex: /zabbix|server/i } 
          }
        }
      },
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

    // Merge hosts with their alert status and automatically determine device status
    const hosts = hostsFromMetrics.map(host => {
      const alertInfo = hostsWithAlerts.find(alert => alert.hostid === host.hostid);
      
      // Automatically determine device status based on office assignments
      const isAssignedToOffice = assignedDeviceIds.includes(host.hostid);
      const deviceStatus = isAssignedToOffice ? 'occupied' : 'available';
      
      return {
        ...host,
        status: alertInfo?.status || 'Operational',
        severity: alertInfo?.severity || 'info',
        device_status: deviceStatus
      };
    });

    // Sort by last seen
    hosts.sort((a, b) => new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime());

    return NextResponse.json({
      count: hosts.length,
      hosts: hosts
    });
  } catch (error) {
    console.error("Error fetching hosts:", error);
    return NextResponse.json(
      { error: "Failed to fetch hosts" },
      { status: 500 }
    );
  }
}
