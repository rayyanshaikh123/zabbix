import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ hostid: string }> }
) {
  try {
    const { hostid } = await params;
    const body = await request.json();
    const { device_status } = body;

    if (!device_status || !['occupied', 'available'].includes(device_status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid device_status. Must be "occupied" or "available"' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const metricsCollection = db.collection('metrics_ts');

    // Update device_status for all metrics of this device
    const result = await metricsCollection.updateMany(
      { 'meta.hostid': hostid },
      { $set: { 'meta.device_status': device_status } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Device status updated to ${device_status}`,
      updated_count: result.modifiedCount
    });

  } catch (error) {
    console.error('Error updating device status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update device status' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hostid: string }> }
) {
  try {
    const { hostid } = await params;
    const { db } = await connectToDatabase();
    const metricsCollection = db.collection('metrics_ts');

    // Get the current device status
    const device = await metricsCollection.findOne(
      { 'meta.hostid': hostid },
      { projection: { 'meta.device_status': 1, 'meta.device_id': 1 } }
    );

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      device_id: device.meta.device_id,
      device_status: device.meta.device_status || 'available'
    });

  } catch (error) {
    console.error('Error fetching device status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device status' },
      { status: 500 }
    );
  }
}
