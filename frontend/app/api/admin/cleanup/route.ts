import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// POST - Clean up old data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      keepDays = 7, 
      minRecordsPerDevice = 100, 
      dryRun = false 
    } = body
    
    const { db } = await connectToDatabase()
    
    // Calculate cutoff timestamp
    const cutoffTime = Math.floor((Date.now() - (keepDays * 24 * 60 * 60 * 1000)) / 1000)
    
    // Get current stats
    const metricsCount = await db.collection('metrics_ts').countDocuments()
    const eventsCount = await db.collection('events').countDocuments()
    
    let metricsDeleted = 0
    let eventsDeleted = 0
    
    if (!dryRun) {
      // Cleanup metrics
      const devices = await db.collection('metrics_ts').distinct('meta.device_id')
      
      for (const deviceId of devices) {
        const deviceMetricsCount = await db.collection('metrics_ts').countDocuments({
          'meta.device_id': deviceId
        })
        
        if (deviceMetricsCount <= minRecordsPerDevice) {
          continue
        }
        
        // Keep only the most recent records
        const metricsToKeep = Math.max(minRecordsPerDevice, deviceMetricsCount - 
          await db.collection('metrics_ts').countDocuments({
            'meta.device_id': deviceId,
            ts: { $lt: cutoffTime }
          })
        )
        
        if (metricsToKeep < deviceMetricsCount) {
          const keepThreshold = await db.collection('metrics_ts')
            .find({ 'meta.device_id': deviceId })
            .sort({ ts: -1 })
            .skip(metricsToKeep - 1)
            .limit(1)
            .toArray()
          
          if (keepThreshold.length > 0) {
            const thresholdTime = keepThreshold[0].ts
            const result = await db.collection('metrics_ts').deleteMany({
              'meta.device_id': deviceId,
              ts: { $lt: thresholdTime }
            })
            metricsDeleted += result.deletedCount
          }
        }
      }
      
      // Cleanup events
      const eventsResult = await db.collection('events').deleteMany({
        detected_at: { $lt: cutoffTime }
      })
      eventsDeleted = eventsResult.deletedCount
    } else {
      // Dry run - just count what would be deleted
      const devices = await db.collection('metrics_ts').distinct('meta.device_id')
      
      for (const deviceId of devices) {
        const deviceMetricsCount = await db.collection('metrics_ts').countDocuments({
          'meta.device_id': deviceId
        })
        
        if (deviceMetricsCount <= minRecordsPerDevice) {
          continue
        }
        
        const oldMetricsCount = await db.collection('metrics_ts').countDocuments({
          'meta.device_id': deviceId,
          ts: { $lt: cutoffTime }
        })
        
        if (oldMetricsCount > 0) {
          const metricsToKeep = Math.max(minRecordsPerDevice, deviceMetricsCount - oldMetricsCount)
          if (metricsToKeep < deviceMetricsCount) {
            const keepThreshold = await db.collection('metrics_ts')
              .find({ 'meta.device_id': deviceId })
              .sort({ ts: -1 })
              .skip(metricsToKeep - 1)
              .limit(1)
              .toArray()
            
            if (keepThreshold.length > 0) {
              const thresholdTime = keepThreshold[0].ts
              const toDelete = await db.collection('metrics_ts').countDocuments({
                'meta.device_id': deviceId,
                ts: { $lt: thresholdTime }
              })
              metricsDeleted += toDelete
            }
          }
        }
      }
      
      eventsDeleted = await db.collection('events').countDocuments({
        detected_at: { $lt: cutoffTime }
      })
    }
    
    // Get final stats
    const finalMetricsCount = await db.collection('metrics_ts').countDocuments()
    const finalEventsCount = await db.collection('events').countDocuments()
    
    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Cleanup completed',
      stats: {
        before: {
          metrics: metricsCount,
          events: eventsCount
        },
        after: {
          metrics: finalMetricsCount,
          events: finalEventsCount
        },
        deleted: {
          metrics: metricsDeleted,
          events: eventsDeleted
        }
      },
      config: {
        keepDays,
        minRecordsPerDevice,
        cutoffTime: new Date(cutoffTime * 1000).toISOString()
      }
    })
    
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup database' },
      { status: 500 }
    )
  }
}

// GET - Get cleanup stats
export async function GET() {
  try {
    const { db } = await connectToDatabase()
    
    const metricsCount = await db.collection('metrics_ts').countDocuments()
    const eventsCount = await db.collection('events').countDocuments()
    
    // Get date range
    const oldestMetric = await db.collection('metrics_ts').findOne({}, { sort: { ts: 1 } })
    const newestMetric = await db.collection('metrics_ts').findOne({}, { sort: { ts: -1 } })
    
    // Get device count
    const deviceCount = await db.collection('metrics_ts').distinct('meta.device_id')
    
    return NextResponse.json({
      success: true,
      stats: {
        metrics: metricsCount,
        events: eventsCount,
        devices: deviceCount.length,
        dateRange: {
          oldest: oldestMetric ? new Date(oldestMetric.ts * 1000).toISOString() : null,
          newest: newestMetric ? new Date(newestMetric.ts * 1000).toISOString() : null
        }
      }
    })
    
  } catch (error) {
    console.error('Error getting cleanup stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get cleanup stats' },
      { status: 500 }
    )
  }
}
