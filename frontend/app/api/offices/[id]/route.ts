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
    
    // Get device count and assigned devices for this office
    const metricsCollection = db.collection('metrics_ts')
    const assignedDeviceIds = office.device_ids || []
    
    // Count devices by location
    const deviceCount = await metricsCollection.distinct('meta.hostid', {
      'meta.location': office.office
    })
    
    // Get assigned devices
    const assignedDevices = await metricsCollection.distinct('meta.hostid', {
      'meta.hostid': { $in: assignedDeviceIds }
    })
    
    return NextResponse.json({
      success: true,
      office: {
        ...office,
        device_count: Math.max(deviceCount.length, assignedDevices.length),
        assigned_devices: assignedDevices,
        device_ids: assignedDeviceIds
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
    const { office, city, country, geo, description, contact_info, status, device_ids } = body
    
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
    if (device_ids) {
      updateData.device_ids = device_ids
      updateData.device_count = device_ids.length
    }
    
    const result = await officesCollection.updateOne(query, { $set: updateData })
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Office not found' },
        { status: 404 }
      )
    }
    
    // Handle device assignments and removals
    if (device_ids !== undefined) {
      const metricsCollection = db.collection('metrics_ts')
      
      // Get current office to compare device assignments
      const currentOffice = await officesCollection.findOne(query)
      const currentDeviceIds = currentOffice?.device_ids || []
      
      // Find devices that were removed (in current but not in new)
      const removedDeviceIds = currentDeviceIds.filter(id => !device_ids.includes(id))
      
      // Find devices that were added (in new but not in current)
      const addedDeviceIds = device_ids.filter(id => !currentDeviceIds.includes(id))
      
      // Set removed devices back to available
      if (removedDeviceIds.length > 0) {
        await metricsCollection.updateMany(
          { 'meta.hostid': { $in: removedDeviceIds } },
          { 
            $set: { 
              'meta.device_status': 'available',
              'meta.location': 'Unassigned'
            } 
          }
        )
      }
      
      // Set added devices to occupied
      if (addedDeviceIds.length > 0) {
        await metricsCollection.updateMany(
          { 'meta.hostid': { $in: addedDeviceIds } },
          { 
            $set: { 
              'meta.location': office || updateData.office,
              'meta.geo': geo || updateData.geo || { lat: 0, lon: 0, source: 'office_assignment' },
              'meta.device_status': 'occupied'
            } 
          }
        )
      }
      
      // Update location for all currently assigned devices
      if (device_ids.length > 0) {
        await metricsCollection.updateMany(
          { 'meta.hostid': { $in: device_ids } },
          { 
            $set: { 
              'meta.location': office || updateData.office,
              'meta.geo': geo || updateData.geo || { lat: 0, lon: 0, source: 'office_assignment' }
            } 
          }
        )
      }
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
    
    // Get the office first to get device_ids before deleting
    const officeToDelete = await officesCollection.findOne(query)
    
    const result = await officesCollection.deleteOne(query)
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Office not found' },
        { status: 404 }
      )
    }
    
    // If office had assigned devices, set them back to available
    if (officeToDelete && officeToDelete.device_ids && officeToDelete.device_ids.length > 0) {
      const metricsCollection = db.collection('metrics_ts')
      
      // Set devices back to available when office is deleted
      await metricsCollection.updateMany(
        { 'meta.hostid': { $in: officeToDelete.device_ids } },
        { 
          $set: { 
            'meta.device_status': 'available',
            'meta.location': 'Unassigned'
          } 
        }
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
