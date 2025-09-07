#!/usr/bin/env node
/**
 * Database Cleanup Script
 * Removes old metrics and events data to prevent database size issues
 */

const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB_NAME = 'netmon';

// Configuration
const CONFIG = {
  // Keep data for the last N days
  KEEP_DAYS: parseInt(process.env.KEEP_DAYS) || 7,
  
  // Keep at least N most recent records per device
  MIN_RECORDS_PER_DEVICE: parseInt(process.env.MIN_RECORDS_PER_DEVICE) || 100,
  
  // Dry run mode (don't actually delete)
  DRY_RUN: process.env.DRY_RUN === 'true'
};

async function cleanupDatabase() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('🔍 Starting database cleanup...');
    console.log(`📅 Keeping data for last ${CONFIG.KEEP_DAYS} days`);
    console.log(`📊 Keeping at least ${CONFIG.MIN_RECORDS_PER_DEVICE} records per device`);
    console.log(`🧪 Dry run mode: ${CONFIG.DRY_RUN ? 'ON' : 'OFF'}`);
    
    // Calculate cutoff timestamp
    const cutoffTime = Math.floor((Date.now() - (CONFIG.KEEP_DAYS * 24 * 60 * 60 * 1000)) / 1000);
    console.log(`⏰ Cutoff timestamp: ${new Date(cutoffTime * 1000).toISOString()}`);
    
    // Get current stats
    const metricsCount = await db.collection('metrics_ts').countDocuments();
    const eventsCount = await db.collection('events').countDocuments();
    
    console.log(`\n📊 Current database stats:`);
    console.log(`   Metrics: ${metricsCount.toLocaleString()}`);
    console.log(`   Events: ${eventsCount.toLocaleString()}`);
    
    // Cleanup metrics
    console.log(`\n🧹 Cleaning up metrics...`);
    await cleanupMetrics(db, cutoffTime);
    
    // Cleanup events
    console.log(`\n🧹 Cleaning up events...`);
    await cleanupEvents(db, cutoffTime);
    
    // Get final stats
    const finalMetricsCount = await db.collection('metrics_ts').countDocuments();
    const finalEventsCount = await db.collection('events').countDocuments();
    
    console.log(`\n✅ Cleanup completed!`);
    console.log(`📊 Final database stats:`);
    console.log(`   Metrics: ${finalMetricsCount.toLocaleString()} (removed ${(metricsCount - finalMetricsCount).toLocaleString()})`);
    console.log(`   Events: ${finalEventsCount.toLocaleString()} (removed ${(eventsCount - finalEventsCount).toLocaleString()})`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function cleanupMetrics(db, cutoffTime) {
  const metricsCollection = db.collection('metrics_ts');
  
  // First, get all unique devices
  const devices = await metricsCollection.distinct('meta.device_id');
  console.log(`   Found ${devices.length} devices`);
  
  let totalDeleted = 0;
  
  for (const deviceId of devices) {
    // Get device metrics count
    const deviceMetricsCount = await metricsCollection.countDocuments({
      'meta.device_id': deviceId
    });
    
    if (deviceMetricsCount <= CONFIG.MIN_RECORDS_PER_DEVICE) {
      console.log(`   ⏭️  Skipping ${deviceId} (only ${deviceMetricsCount} records)`);
      continue;
    }
    
    // Find old metrics for this device
    const oldMetricsQuery = {
      'meta.device_id': deviceId,
      ts: { $lt: cutoffTime }
    };
    
    const oldMetricsCount = await metricsCollection.countDocuments(oldMetricsQuery);
    
    if (oldMetricsCount === 0) {
      console.log(`   ⏭️  Skipping ${deviceId} (no old metrics)`);
      continue;
    }
    
    // Keep only the most recent records if we would delete too many
    const metricsToKeep = Math.max(CONFIG.MIN_RECORDS_PER_DEVICE, deviceMetricsCount - oldMetricsCount);
    
    if (metricsToKeep < deviceMetricsCount) {
      // Get the timestamp of the Nth most recent record
      const keepThreshold = await metricsCollection
        .find({ 'meta.device_id': deviceId })
        .sort({ ts: -1 })
        .skip(metricsToKeep - 1)
        .limit(1)
        .toArray();
      
      if (keepThreshold.length > 0) {
        const thresholdTime = keepThreshold[0].ts;
        
        const deleteQuery = {
          'meta.device_id': deviceId,
          ts: { $lt: thresholdTime }
        };
        
        const toDelete = await metricsCollection.countDocuments(deleteQuery);
        
        if (toDelete > 0) {
          if (!CONFIG.DRY_RUN) {
            const result = await metricsCollection.deleteMany(deleteQuery);
            totalDeleted += result.deletedCount;
            console.log(`   🗑️  ${deviceId}: deleted ${result.deletedCount.toLocaleString()} metrics`);
          } else {
            console.log(`   🧪 ${deviceId}: would delete ${toDelete.toLocaleString()} metrics (dry run)`);
          }
        }
      }
    }
  }
  
  if (!CONFIG.DRY_RUN) {
    console.log(`   ✅ Total metrics deleted: ${totalDeleted.toLocaleString()}`);
  }
}

async function cleanupEvents(db, cutoffTime) {
  const eventsCollection = db.collection('events');
  
  // Delete old events
  const oldEventsQuery = {
    detected_at: { $lt: cutoffTime }
  };
  
  const oldEventsCount = await eventsCollection.countDocuments(oldEventsQuery);
  
  if (oldEventsCount === 0) {
    console.log(`   ⏭️  No old events to delete`);
    return;
  }
  
  if (!CONFIG.DRY_RUN) {
    const result = await eventsCollection.deleteMany(oldEventsQuery);
    console.log(`   🗑️  Deleted ${result.deletedCount.toLocaleString()} events`);
  } else {
    console.log(`   🧪 Would delete ${oldEventsCount.toLocaleString()} events (dry run)`);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupDatabase().catch(console.error);
}

module.exports = { cleanupDatabase };
