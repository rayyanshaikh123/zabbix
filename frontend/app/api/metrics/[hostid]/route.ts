import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// GET - Get raw metrics for a specific device
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hostid: string }> }
) {
  try {
    const { hostid } = await params
    
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    
    // Get all metrics for this device, sorted by timestamp (newest first)
    const metrics = await metricsCollection
      .find({ 'meta.hostid': hostid })
      .sort({ ts: -1 })
      .limit(1000) // Limit to 1000 most recent metrics
      .toArray()
    
    return NextResponse.json({
      success: true,
      metrics,
      count: metrics.length
    })
    
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}