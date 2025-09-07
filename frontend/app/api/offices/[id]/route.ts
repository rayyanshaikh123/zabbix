import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

// GET - Get specific office details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { db } = await connectToDatabase()
    const officesCollection = db.collection('offices')
    
    // Try to find by ObjectId first, then by office name
    let office
    try {
      office = await officesCollection.findOne({ _id: new ObjectId(id) })
    } catch {
      // If ObjectId parsing fails, search by office name
      office = await officesCollection.findOne({ office: id })
    }
    
    if (!office) {
      return NextResponse.json(
        { success: false, error: 'Office not found' },
        { status: 404 }
      )
    }
    
    // Get device count for this office
    const metricsCollection = db.collection('metrics_ts')
    const deviceCount = await metricsCollection.distinct('meta.hostid', {
      'meta.location': office.office
    })
    
    return NextResponse.json({
      success: true,
      office: {
        ...office,
        device_count: deviceCount.length
      }
    })
    
  } catch (error) {
    console.error('Error fetching office:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch office' },
      { status: 500 }
    )
  }
}

// PUT - Update office
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { office, city, country, geo, description, contact_info, status } = body
    
    const { db } = await connectToDatabase()
    const officesCollection = db.collection('offices')
    
    // Try to find by ObjectId first, then by office name
    let query
    try {
      query = { _id: new ObjectId(id) }
    } catch {
      query = { office: id }
    }
    
    const updateData: any = {
      updated_at: new Date()
    }
    
    if (office) updateData.office = office
    if (city) updateData.city = city
    if (country) updateData.country = country
    if (geo) updateData.geo = geo
    if (description !== undefined) updateData.description = description
    if (contact_info) updateData.contact_info = contact_info
    if (status) updateData.status = status
    
    const result = await officesCollection.updateOne(query, { $set: updateData })
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Office not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Office updated successfully',
      updatedCount: result.modifiedCount
    })
    
  } catch (error) {
    console.error('Error updating office:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update office' },
      { status: 500 }
    )
  }
}

// DELETE - Delete office
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { db } = await connectToDatabase()
    const officesCollection = db.collection('offices')
    
    // Try to find by ObjectId first, then by office name
    let query
    try {
      query = { _id: new ObjectId(id) }
    } catch {
      query = { office: id }
    }
    
    const result = await officesCollection.deleteOne(query)
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Office not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Office deleted successfully',
      deletedCount: result.deletedCount
    })
    
  } catch (error) {
    console.error('Error deleting office:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete office' },
      { status: 500 }
    )
  }
}
