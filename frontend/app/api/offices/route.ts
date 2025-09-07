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
    
    // Calculate real-time device count for each office
    const metricsCollection = db.collection('metrics_ts')
    const officesWithDeviceCount = await Promise.all(
      offices.map(async (office) => {
        try {
          // Count unique devices for this office
          const deviceCount = await metricsCollection.distinct('meta.hostid', {
            'meta.location': office.office
          })
          
          return {
            ...office,
            device_count: deviceCount.length
          }
        } catch (error) {
          console.warn(`Failed to get device count for office ${office.office}:`, error)
          return office // Return original office data if device count fails
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
    const { office, city, country, geo, description, contact_info } = body
    
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
      created_at: new Date(),
      updated_at: new Date(),
      device_count: 0,
      status: 'active'
    }
    
    const result = await officesCollection.insertOne(officeDoc)
    
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
