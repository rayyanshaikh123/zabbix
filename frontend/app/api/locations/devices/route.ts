import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// GET - Get devices by location for office creation form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const city = searchParams.get('city')
    const country = searchParams.get('country')
    
    if (!location || !city || !country) {
      return NextResponse.json(
        { success: false, error: 'location, city, and country are required' },
        { status: 400 }
      )
    }
    
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    
    // Get all devices at this location
    const devices = await metricsCollection.aggregate([
      {
        $match: {
          'meta.location': location,
          'meta.geo.city': city,
          'meta.geo.country': country,
          'meta.device_id': { 
            $not: { $regex: /zabbix|server/i } 
          }
        }
      },
      {
        $group: {
          _id: {
            hostid: '$meta.hostid',
            device_id: '$meta.device_id',
            device_type: '$meta.device_type'
          },
          last_seen: { $max: '$ts' },
          status: { $last: '$status' },
          severity: { $last: '$severity' },
          interfaces: { $addToSet: '$meta.iface' },
          total_metrics: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id.hostid',
          device_id: '$_id.device_id',
          device_type: '$_id.device_type',
          last_seen: 1,
          status: 1,
          severity: 1,
          interfaces: { $filter: { input: '$interfaces', cond: { $ne: ['$$this', '_global'] } } },
          total_metrics: 1
        }
      },
      { $sort: { device_id: 1 } }
    ]).toArray()
    
    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
      location: { location, city, country }
    })
    
  } catch (error) {
    console.error('Error fetching devices by location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch devices by location' },
      { status: 500 }
    )
  }
}
