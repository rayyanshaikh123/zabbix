import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongo'

// GET - Get specific device details with comprehensive data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hostid: string }> }
) {
  try {
    const { hostid } = await params
    
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    
    // Get all metrics for this device
    const metrics = await metricsCollection.find({ 'meta.hostid': hostid }).toArray()
    
    if (metrics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }
    
    // Debug: Log first few metrics to see the structure
    console.log('Sample metrics for device:', hostid)
    console.log('Total metrics found:', metrics.length)
    if (metrics.length > 0) {
      console.log('First metric sample:', JSON.stringify(metrics[0], null, 2))
    }
    
    // Process and organize all the data
    const deviceData = processDeviceMetrics(metrics)
    
    return NextResponse.json({
      success: true,
      device: deviceData
    })
    
  } catch (error) {
    console.error('Error fetching device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device' },
      { status: 500 }
    )
  }
}

// Process and organize device metrics into structured data
function processDeviceMetrics(metrics: any[]) {
  const device = {
    hostid: metrics[0]?.meta?.hostid || 'Unknown',
    device_id: metrics[0]?.meta?.device_id || 'Unknown',
    device_name: metrics[0]?.meta?.device_id || 'Unknown',
    device_type: 'Router', // Default type
    location: metrics[0]?.meta?.location || 'Unknown',
    geo: metrics[0]?.meta?.geo || null,
    last_seen: new Date(Math.max(...metrics.map(m => m.ts * 1000))),
    system_info: {},
    interfaces: {},
    system_metrics: {
      memory: {},
      cpu: {},
      hardware: {},
      snmp: {}
    }
  }
  
  // Process each metric
  metrics.forEach(metric => {
    const metricName = metric.metric || ''
    const value = metric.value
    const iface = metric.meta?.ifdescr || 'System'
    
    // System Information - match actual Zabbix metric names
    if (metricName === 'system.name' || metricName.includes('sysName')) {
      device.system_info.system_name = value
    } else if (metricName === 'system.descr[sysDescr.0]' || metricName.includes('sysDescr')) {
      device.system_info.system_description = value
    } else if (metricName === 'system.contact[sysContact.0]' || metricName.includes('sysContact')) {
      device.system_info.system_contact = value
    } else if (metricName === 'system.location[sysLocation.0]' || metricName.includes('sysLocation')) {
      device.system_info.system_location = value
    } else if (metricName === 'system.sw.os[sysDescr.0]' || metricName.includes('Cisco IOS')) {
      device.system_info.os_version = value
    } else if (metricName === 'system.hw.model' || metricName.includes('Hardware model')) {
      device.system_info.hardware_model = value
    } else if (metricName === 'system.hw.serialnumber' || metricName === 'system.hw.serialnumber[entPhysicalSerialNum.1]' || metricName.includes('Hardware serial')) {
      device.system_info.hardware_serial = value
    } else if (metricName === 'system.hw.uptime[hrSystemUptime.0]' || metricName.includes('hrSystemUptime')) {
      device.system_info.uptime_hardware = value
    } else if (metricName === 'system.net.uptime[sysUpTime.0]' || metricName.includes('sysUpTime')) {
      device.system_info.uptime_network = value
    }
    
    // Memory Information - match actual Zabbix metric names
    if (metricName === 'vm.memory.util[vm.memory.util.1]' || metricName === 'vm.memory.util[vm.memory.util.2]') {
      device.system_metrics.memory.utilization = value
    } else if (metricName === 'vm.memory.free[ciscoMemoryPoolFree.1]' || metricName === 'vm.memory.free[ciscoMemoryPoolFree.2]') {
      device.system_metrics.memory.free = value
    } else if (metricName === 'vm.memory.used[ciscoMemoryPoolUsed.1]' || metricName === 'vm.memory.used[ciscoMemoryPoolUsed.2]') {
      device.system_metrics.memory.used = value
    }
    
    // CPU Information
    if (metricName === 'system.cpu.util[cpmCPUTotal5minRev.1]' || metricName.includes('CPU utilization')) {
      device.system_metrics.cpu.utilization = value
    }
    
    // Hardware Information - match actual Zabbix metric names
    if (metricName === 'sensor.fan.status[ciscoEnvMonFanState.1]' || metricName.includes('Fan status')) {
      device.system_metrics.hardware.fan_status = value === 1 ? 'Normal' : 'Abnormal'
    } else if (metricName === 'sensor.psu.status[ciscoEnvMonSupplyState.1]' || metricName.includes('Power supply status')) {
      device.system_metrics.hardware.power_status = value === 1 ? 'Normal' : 'Abnormal'
    } else if (metricName === 'sensor.temp.value[ciscoEnvMonTemperatureValue.1]' || (metricName.includes('Temperature') && !metricName.includes('status'))) {
      device.system_metrics.hardware.temperature = value
    } else if (metricName === 'sensor.temp.status[ciscoEnvMonTemperatureState.1]' || metricName.includes('Temperature status')) {
      device.system_metrics.hardware.temperature_status = value === 1 ? 'Normal' : 'Abnormal'
    }
    
    // SNMP Information
    if (metricName === 'zabbix[host,snmp,available]' || metricName.includes('SNMP agent')) {
      device.system_metrics.snmp.agent_availability = value === 1 ? 'Available' : 'Unavailable'
    } else if (metricName === 'snmptrap.fallback' || metricName.includes('SNMP traps')) {
      device.system_metrics.snmp.traps = value
    }
    
    // Interface Information - match actual agent output
    if (iface !== 'System') {
      if (!device.interfaces[iface]) {
        device.interfaces[iface] = {
          name: iface,
          status: 'Unknown',
          speed: null,
          duplex: null,
          traffic: {
            bits_received: 0,
            bits_sent: 0,
            packets_received: 0,
            packets_sent: 0,
            errors_in: 0,
            errors_out: 0,
            discarded_in: 0,
            discarded_out: 0
          },
          last_seen: new Date(metric.ts * 1000)
        }
      }
      
      // Update interface data - match actual Zabbix metric names
      if (metricName.includes('net.if.status') || metricName.includes('ifOperStatus')) {
        device.interfaces[iface].status = value === 1 ? 'Up' : 'Down'
      } else if (metricName.includes('net.if.speed[ifHighSpeed') || metricName.includes('ifSpeed')) {
        device.interfaces[iface].speed = value
      } else if (metricName.includes('net.if.duplex[dot3StatsDuplexStatus') || metricName.includes('ifDuplex')) {
        const duplexMap = { 1: 'Half', 2: 'Full', 3: 'Auto' }
        device.interfaces[iface].duplex = duplexMap[value] || 'Unknown'
      } else if (metricName.includes('net.if.in[ifHCInOctets') || metricName.includes('ifInOctets')) {
        device.interfaces[iface].traffic.bits_received = value
      } else if (metricName.includes('net.if.out[ifHCOutOctets') || metricName.includes('ifOutOctets')) {
        device.interfaces[iface].traffic.bits_sent = value
      } else if (metricName.includes('net.if.in.errors[ifInErrors') || metricName.includes('ifInErrors')) {
        device.interfaces[iface].traffic.errors_in = value
      } else if (metricName.includes('net.if.out.errors[ifOutErrors') || metricName.includes('ifOutErrors')) {
        device.interfaces[iface].traffic.errors_out = value
      } else if (metricName.includes('net.if.in.discards[ifInDiscards') || metricName.includes('ifInDiscards')) {
        device.interfaces[iface].traffic.discarded_in = value
      } else if (metricName.includes('net.if.out.discards[ifOutDiscards') || metricName.includes('ifOutDiscards')) {
        device.interfaces[iface].traffic.discarded_out = value
      }
      
      // Update last seen
      if (metric.ts * 1000 > device.interfaces[iface].last_seen.getTime()) {
        device.interfaces[iface].last_seen = new Date(metric.ts * 1000)
      }
    }
  })
  
  return device
}

// PUT - Update device
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ hostid: string }> }
) {
  try {
    const { hostid } = await params
    const body = await request.json()
    const { device_id, location, geo, device_type } = body
    
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    
    // Update all metrics for this device
    const updateResult = await metricsCollection.updateMany(
      { 'meta.hostid': hostid },
      {
        $set: {
          'meta.device_id': device_id || undefined,
          'meta.location': location || undefined,
          'meta.geo': geo || undefined,
          'meta.device_type': device_type || undefined
        }
      }
    )
    
    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Device updated successfully',
      updatedCount: updateResult.modifiedCount
    })
    
  } catch (error) {
    console.error('Error updating device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update device' },
      { status: 500 }
    )
  }
}

// DELETE - Delete device
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hostid: string }> }
) {
  try {
    const { hostid } = await params
    
    const { db } = await connectToDatabase()
    const metricsCollection = db.collection('metrics_ts')
    const eventsCollection = db.collection('events')
    
    // Delete all metrics for this device
    const metricsResult = await metricsCollection.deleteMany({
      'meta.hostid': hostid
    })
    
    // Delete all events for this device
    const eventsResult = await eventsCollection.deleteMany({
      hostid: hostid
    })
    
    if (metricsResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Device deleted successfully',
      deletedMetrics: metricsResult.deletedCount,
      deletedEvents: eventsResult.deletedCount
    })
    
  } catch (error) {
    console.error('Error deleting device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete device' },
      { status: 500 }
    )
  }
}