import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// GET - Check if network devices exist at a specific location
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
    
    // Check if any network devices exist at this location
    const deviceQuery = {
      'meta.location': location,
      'meta.geo.city': city,
      'meta.geo.country': country,
      // Only count actual network devices (not system metrics)
      'meta.iface': { $ne: '_global' }
    }
    
    const deviceCount = await metricsCollection.distinct('meta.device_id', deviceQuery)
    
    // Get device details if they exist
    let devices = []
    if (deviceCount.length > 0) {
      devices = await metricsCollection.aggregate([
        { $match: deviceQuery },
        {
          $group: {
            _id: '$meta.device_id',
            hostid: { $first: '$meta.hostid' },
            device_id: { $first: '$meta.device_id' },
            device_type: { $first: '$meta.device_type' },
            last_seen: { $max: '$ts' },
            status: { $last: '$status' },
            severity: { $last: '$severity' }
          }
        },
        { $sort: { device_id: 1 } }
      ]).toArray()
    }
    
    return NextResponse.json({
      success: true,
      hasDevices: deviceCount.length > 0,
      deviceCount: deviceCount.length,
      devices: devices,
      location: { location, city, country }
    })
    
  } catch (error) {
    console.error('Error checking devices at location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check devices at location' },
      { status: 500 }
    )
  }
}
