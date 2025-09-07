import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// POST - Initialize offices collection with sample data
export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const officesCollection = db.collection('offices')
    
    // Check if offices already exist
    const existingOffices = await officesCollection.countDocuments()
    if (existingOffices > 0) {
      return NextResponse.json({
        success: true,
        message: `Offices collection already exists with ${existingOffices} offices`,
        count: existingOffices
      })
    }
    
    // Sample office data
    const sampleOffices = [
      {
        office: 'Mumbai Suburban',
        city: 'Mumbai',
        country: 'India',
        geo: {
          lat: 19.1399626142165,
          lon: 72.8435687889305,
          source: 'zabbix_inventory'
        },
        description: 'Main office in Mumbai Suburban area with network infrastructure',
        contact_info: {
          address: 'Mumbai Suburban, Maharashtra, India',
          phone: '+91-22-XXXX-XXXX',
          email: 'mumbai@company.com'
        },
        created_at: new Date(),
        updated_at: new Date(),
        device_count: 0,
        status: 'active'
      },
      {
        office: 'Mumbai Central',
        city: 'Mumbai',
        country: 'India',
        geo: {
          lat: 19.0176,
          lon: 72.8562,
          source: 'manual'
        },
        description: 'Central Mumbai office location',
        contact_info: {
          address: 'Mumbai Central, Maharashtra, India',
          phone: '+91-22-XXXX-XXXX',
          email: 'central@company.com'
        },
        created_at: new Date(),
        updated_at: new Date(),
        device_count: 0,
        status: 'active'
      },
      {
        office: 'Delhi Office',
        city: 'Delhi',
        country: 'India',
        geo: {
          lat: 28.6139,
          lon: 77.2090,
          source: 'manual'
        },
        description: 'Delhi regional office',
        contact_info: {
          address: 'Delhi, India',
          phone: '+91-11-XXXX-XXXX',
          email: 'delhi@company.com'
        },
        created_at: new Date(),
        updated_at: new Date(),
        device_count: 0,
        status: 'active'
      }
    ]
    
    // Insert sample offices
    const result = await officesCollection.insertMany(sampleOffices)
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${result.insertedCount} sample offices`,
      count: result.insertedCount,
      offices: sampleOffices
    })
    
  } catch (error) {
    console.error('Error setting up offices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to setup offices collection' },
      { status: 500 }
    )
  }
}

// GET - Check offices collection status
export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const officesCollection = db.collection('offices')
    
    const count = await officesCollection.countDocuments()
    const offices = await officesCollection.find({}).limit(10).toArray()
    
    return NextResponse.json({
      success: true,
      count,
      offices,
      message: `Offices collection has ${count} documents`
    })
    
  } catch (error) {
    console.error('Error checking offices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check offices collection' },
      { status: 500 }
    )
  }
}
