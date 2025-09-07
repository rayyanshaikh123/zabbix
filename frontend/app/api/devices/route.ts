import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// GET - List devices with optional location filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const city = searchParams.get('city')
    
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    
    // Build query based on filters
    let query: any = {}
    
    if (location) {
      query['meta.location'] = location
    }
    
    if (city) {
      query['meta.geo.city'] = city
    }
    
    // Get unique devices with their latest metrics
    const devices = await metricsCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$meta.device_id',
          hostid: { $first: '$meta.hostid' },
          device_id: { $first: '$meta.device_id' },
          location: { $first: '$meta.location' },
          geo: { $first: '$meta.geo' },
          last_seen: { $max: '$ts' },
          interface_count: { $addToSet: '$meta.iface' },
          status: { $last: '$status' },
          severity: { $last: '$severity' }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: 1,
          device_id: 1,
          location: 1,
          geo: 1,
          last_seen: 1,
          interface_count: { $size: '$interface_count' },
          status: 1,
          severity: 1
        }
      },
      { $sort: { device_id: 1 } }
    ]).toArray()
    
    return NextResponse.json({
      success: true,
      devices,
      count: devices.length
    })
    
  } catch (error) {
    console.error('Error fetching devices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}

// POST - Create a new device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_id, hostid, location, geo, device_type = 'other' } = body
    
    if (!device_id || !hostid) {
      return NextResponse.json(
        { success: false, error: 'device_id and hostid are required' },
        { status: 400 }
      )
    }
    
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    
    // Check if device already exists
    const existingDevice = await metricsCollection.findOne({
      'meta.device_id': device_id,
      'meta.hostid': hostid
    })
    
    if (existingDevice) {
      return NextResponse.json(
        { success: false, error: 'Device already exists' },
        { status: 409 }
      )
    }
    
    // Create initial metric entry for the device
    const deviceMetric = {
      ts: new Date(),
      metric: 'device_status',
      value: 'Up',
      status: 'Up',
      severity: 'info',
      meta: {
        hostid,
        device_id,
        location: location || 'Unknown Location',
        geo: geo || { lat: 0, lon: 0, source: 'manual' },
        iface: '_global',
        device_type
      }
    }
    
    await metricsCollection.insertOne(deviceMetric)
    
    return NextResponse.json({
      success: true,
      message: 'Device created successfully',
      device: {
        hostid,
        device_id,
        location: deviceMetric.meta.location,
        geo: deviceMetric.meta.geo,
        device_type
      }
    })
    
  } catch (error) {
    console.error('Error creating device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create device' },
      { status: 500 }
    )
  }
}
