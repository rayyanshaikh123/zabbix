import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// GET - List offices with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')
    const city = searchParams.get('city')
    const office = searchParams.get('office')
    
    const { db } = await connectToDatabase()
    const officesCollection = db.collection('offices')
    
    // Build query based on filters
    let query: any = {}
    
    if (country) {
      query.country = country
    }
    
    if (city) {
      query.city = city
    }
    
    if (office) {
      query.office = office
    }
    
    const offices = await officesCollection
      .find(query)
      .sort({ country: 1, city: 1, office: 1 })
      .toArray()
    
    // Calculate real-time device count and get assigned devices for each office
    const metricsCollection = db.collection('metrics_ts')
    const officesWithDeviceCount = await Promise.all(
      offices.map(async (office) => {
        try {
          // Get assigned device IDs from office document
          const assignedDeviceIds = office.device_ids || []
          
          // Count unique devices for this office from metrics
          const deviceCount = await metricsCollection.distinct('meta.hostid', {
            'meta.location': office.office
          })
          
          // Get device details for assigned devices
          const assignedDevices = await metricsCollection.distinct('meta.hostid', {
            'meta.hostid': { $in: assignedDeviceIds }
          })
          
          // Calculate health data
          const finalDeviceCount = Math.max(deviceCount.length, assignedDevices.length)
          let healthScore = 0
          let healthStatus = 'critical'
          
          if (finalDeviceCount > 0) {
            // Get device health data
            const deviceHealthData = await metricsCollection.aggregate([
              {
                $match: {
                  'meta.hostid': { $in: assignedDevices.length > 0 ? assignedDevices : deviceCount },
                  'metric': { $in: ['device_status', 'interface_status', 'cpu_usage', 'memory_usage'] }
                }
              },
              {
                $group: {
                  _id: '$meta.hostid',
                  status: { $first: '$value' },
                  metrics: { $push: { metric: '$metric', value: '$value' } }
                }
              }
            ]).toArray()
            
            if (deviceHealthData.length > 0) {
              const healthyDevices = deviceHealthData.filter(device => 
                device.status === 'Up' || device.status === 'Operational'
              ).length
              healthScore = Math.round((healthyDevices / deviceHealthData.length) * 100)
              
              if (healthScore >= 90) {
                healthStatus = 'excellent'
              } else if (healthScore >= 75) {
                healthStatus = 'good'
              } else if (healthScore >= 50) {
                healthStatus = 'warning'
              }
            } else {
              // If no health data but has devices, assume good health
              healthScore = 100
              healthStatus = 'excellent'
            }
          }
          
          return {
            ...office,
            device_count: finalDeviceCount,
            assigned_devices: assignedDevices,
            device_ids: assignedDeviceIds,
            health_score: healthScore,
            health_status: healthStatus
          }
        } catch (error) {
          console.warn(`Failed to get device count for office ${office.office}:`, error)
          return {
            ...office,
            device_count: office.device_count || 0,
            assigned_devices: [],
            device_ids: office.device_ids || [],
            health_score: 0,
            health_status: 'critical'
          }
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      offices: officesWithDeviceCount,
      count: officesWithDeviceCount.length
    })
    
  } catch (error) {
    console.error('Error fetching offices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offices' },
      { status: 500 }
    )
  }
}

// POST - Create a new office
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { office, city, country, geo, description, contact_info, device_ids } = body
    
    if (!office || !city || !country) {
      return NextResponse.json(
        { success: false, error: 'office, city, and country are required' },
        { status: 400 }
      )
    }
    
    const { db } = await connectToDatabase()
    const officesCollection = db.collection('offices')
    
    // Check if office already exists
    const existingOffice = await officesCollection.findOne({
      office,
      city,
      country
    })
    
    if (existingOffice) {
      return NextResponse.json(
        { success: false, error: 'Office already exists in this city and country' },
        { status: 409 }
      )
    }
    
    // Create new office document
    const officeDoc = {
      office,
      city,
      country,
      geo: geo || { lat: 0, lon: 0, source: 'manual' },
      description: description || '',
      contact_info: contact_info || {},
      device_ids: device_ids || [], // Store assigned device IDs
      created_at: new Date(),
      updated_at: new Date(),
      device_count: device_ids ? device_ids.length : 0,
      status: 'active'
    }
    
    const result = await officesCollection.insertOne(officeDoc)
    
    // If devices are assigned, update their location information and status
    if (device_ids && device_ids.length > 0) {
      const metricsCollection = db.collection('metrics_ts')
      
      // Update device location and status in metrics collection
      await metricsCollection.updateMany(
        { 'meta.hostid': { $in: device_ids } },
        { 
          $set: { 
            'meta.location': office,
            'meta.geo': geo || { lat: 0, lon: 0, source: 'office_assignment' },
            'meta.device_status': 'occupied' // Automatically set to occupied when assigned to office
          } 
        }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Office created successfully',
      office: {
        _id: result.insertedId,
        ...officeDoc
      }
    })
    
  } catch (error) {
    console.error('Error creating office:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create office' },
      { status: 500 }
    )
  }
}
