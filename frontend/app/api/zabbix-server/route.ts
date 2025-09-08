import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// GET - Get Zabbix server information
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    
    // Find Zabbix server information from metrics
    const zabbixServerMetric = await metricsCollection.findOne({
      'meta.server_type': 'zabbix_server',
      'metric': 'zabbix_server_info'
    })
    
    if (!zabbixServerMetric) {
      return NextResponse.json({
        success: false,
        error: 'Zabbix server information not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      server: {
        hostname: zabbixServerMetric.value.hostname,
        name: zabbixServerMetric.value.name,
        hostid: zabbixServerMetric.meta.hostid,
        interfaces: zabbixServerMetric.value.interfaces,
        inventory: zabbixServerMetric.value.inventory,
        last_updated: new Date(zabbixServerMetric.ts * 1000)
      }
    })
    
  } catch (error) {
    console.error('Error fetching Zabbix server info:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Zabbix server information' },
      { status: 500 }
    )
  }
}
