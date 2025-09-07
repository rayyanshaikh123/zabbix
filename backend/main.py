# backend/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from motor.motor_asyncio import AsyncIOMotorClient
import os, time, datetime, asyncio

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.environ.get("DB_NAME", "netmon")
METRICS_COLL = os.environ.get("METRICS_COLL", "metrics_ts")
EVENTS_COLL = os.environ.get("EVENTS_COLL", "events")

# Cleanup configuration
CLEANUP_ENABLED = os.environ.get("CLEANUP_ENABLED", "true").lower() == "true"
CLEANUP_INTERVAL_HOURS = int(os.environ.get("CLEANUP_INTERVAL_HOURS", "24"))
KEEP_DAYS = int(os.environ.get("KEEP_DAYS", "7"))
MIN_RECORDS_PER_DEVICE = int(os.environ.get("MIN_RECORDS_PER_DEVICE", "100"))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="NetMon Ingest API")

# ---------- Cleanup functions ----------
async def cleanup_old_data():
    """Clean up old metrics and events data"""
    try:
        print(f"🧹 Starting automatic cleanup (keep {KEEP_DAYS} days, min {MIN_RECORDS_PER_DEVICE} records per device)")
        
        # Calculate cutoff timestamp
        cutoff_time = datetime.datetime.utcnow() - datetime.timedelta(days=KEEP_DAYS)
        
        # Get current stats
        metrics_count = await db[METRICS_COLL].count_documents({})
        events_count = await db[EVENTS_COLL].count_documents({})
        
        print(f"📊 Before cleanup: {metrics_count} metrics, {events_count} events")
        
        # Cleanup metrics
        devices = await db[METRICS_COLL].distinct("meta.device_id")
        total_metrics_deleted = 0
        
        for device_id in devices:
            device_metrics_count = await db[METRICS_COLL].count_documents({"meta.device_id": device_id})
            
            if device_metrics_count <= MIN_RECORDS_PER_DEVICE:
                continue
            
            # Keep only the most recent records
            metrics_to_keep = max(MIN_RECORDS_PER_DEVICE, device_metrics_count - 
                await db[METRICS_COLL].count_documents({
                    "meta.device_id": device_id,
                    "ts": {"$lt": cutoff_time}
                })
            )
            
            if metrics_to_keep < device_metrics_count:
                # Get the timestamp of the Nth most recent record
                keep_threshold = await db[METRICS_COLL].find(
                    {"meta.device_id": device_id}
                ).sort("ts", -1).skip(metrics_to_keep - 1).limit(1).to_list(1)
                
                if keep_threshold:
                    threshold_time = keep_threshold[0]["ts"]
                    result = await db[METRICS_COLL].delete_many({
                        "meta.device_id": device_id,
                        "ts": {"$lt": threshold_time}
                    })
                    total_metrics_deleted += result.deleted_count
        
        # Cleanup events
        events_result = await db[EVENTS_COLL].delete_many({
            "detected_at": {"$lt": cutoff_time}
        })
        events_deleted = events_result.deleted_count
        
        # Get final stats
        final_metrics_count = await db[METRICS_COLL].count_documents({})
        final_events_count = await db[EVENTS_COLL].count_documents({})
        
        print(f"✅ Cleanup completed: deleted {total_metrics_deleted} metrics, {events_deleted} events")
        print(f"📊 After cleanup: {final_metrics_count} metrics, {final_events_count} events")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")

async def cleanup_scheduler():
    """Background task to run cleanup periodically"""
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_HOURS * 3600)  # Convert hours to seconds
            if CLEANUP_ENABLED:
                await cleanup_old_data()
        except Exception as e:
            print(f"❌ Error in cleanup scheduler: {e}")

# ---------- Pydantic models ----------
class MetricIn(BaseModel):
    ts: Optional[int] = Field(default_factory=lambda: int(time.time()))
    meta: Dict[str, Any]
    metric: str
    value: Any
    value_type: Optional[str] = "gauge"

class EventIn(BaseModel):
    device_id: str
    hostid: Optional[str] = None
    iface: Optional[str] = None
    metric: str
    value: Optional[Any] = None
    status: str
    severity: Optional[str] = "info"
    detected_at: Optional[int] = Field(default_factory=lambda: int(time.time()))
    evidence: Optional[Dict[str, Any]] = None
    labels: Optional[List[str]] = []

# ---------- endpoints ----------
@app.on_event("startup")
async def ensure_collections():
    # ensure time-series collection exists (if not, create it)
    existing = await db.list_collection_names()
    if METRICS_COLL not in existing:
        try:
            await db.create_collection(
                METRICS_COLL,
                timeseries={
                    "timeField": "ts",
                    "metaField": "meta",
                    "granularity": "seconds"
                }
            )
        except Exception as e:
            # some servers may not allow create_collection via Motor the same; fail fast
            print("Warning: could not create timeseries collection:", e)
    # create indexes
    try:
        await db[METRICS_COLL].create_index([("meta.device_id", 1), ("metric", 1)])
        await db[EVENTS_COLL].create_index([("device_id", 1), ("detected_at", -1)])
    except Exception as e:
        print("Index creation warning:", e)
    
    # Start cleanup scheduler if enabled
    if CLEANUP_ENABLED:
        print(f"🧹 Starting cleanup scheduler (every {CLEANUP_INTERVAL_HOURS} hours)")
        asyncio.create_task(cleanup_scheduler())
    else:
        print("🧹 Cleanup scheduler disabled")

@app.post("/ingest/metrics", status_code=201)
async def ingest_metrics(payload: List[MetricIn]):
    docs = []
    for m in payload:
        doc = m.dict()
        # convert ts int -> datetime for Mongo if desired
        try:
            doc["ts"] = datetime.datetime.fromtimestamp(int(doc["ts"]))
        except Exception:
            doc["ts"] = datetime.datetime.utcnow()
        docs.append(doc)
    try:
        res = await db[METRICS_COLL].insert_many(docs)
        return {"inserted": len(res.inserted_ids)}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/ingest/events", status_code=201)

async def ingest_events(payload: List[EventIn]):
    docs = [e.dict() for e in payload]
    for d in docs:
        try:
            d["detected_at"] = datetime.datetime.fromtimestamp(int(d.get("detected_at", time.time())))
        except Exception:
            d["detected_at"] = datetime.datetime.utcnow()
    try:
        res = await db[EVENTS_COLL].insert_many(docs)
        return {"inserted": len(res.inserted_ids)}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/metrics")
async def get_metrics(device_id: str, metric: str, start_ts: int, end_ts: int, limit: int = 1000):
    start = datetime.datetime.fromtimestamp(start_ts)
    end = datetime.datetime.fromtimestamp(end_ts)
    cursor = db[METRICS_COLL].find({
        "meta.device_id": device_id,
        "metric": metric,
        "ts": {"$gte": start, "$lte": end}
    }).sort("ts", 1).limit(limit)
    docs = []
    async for d in cursor:
        d["_id"] = str(d["_id"])
        # convert ts back to epoch
        d["ts"] = int(d["ts"].timestamp())
        docs.append(d)
    return {"count": len(docs), "data": docs}

@app.post("/admin/cleanup")
async def manual_cleanup(keep_days: int = KEEP_DAYS, min_records: int = MIN_RECORDS_PER_DEVICE):
    """Manually trigger cleanup"""
    try:
        print(f"🧹 Manual cleanup triggered (keep {keep_days} days, min {min_records} records per device)")
        
        # Calculate cutoff timestamp
        cutoff_time = datetime.datetime.utcnow() - datetime.timedelta(days=keep_days)
        
        # Get current stats
        metrics_count = await db[METRICS_COLL].count_documents({})
        events_count = await db[EVENTS_COLL].count_documents({})
        
        # Cleanup metrics
        devices = await db[METRICS_COLL].distinct("meta.device_id")
        total_metrics_deleted = 0
        
        for device_id in devices:
            device_metrics_count = await db[METRICS_COLL].count_documents({"meta.device_id": device_id})
            
            if device_metrics_count <= min_records:
                continue
            
            # Keep only the most recent records
            metrics_to_keep = max(min_records, device_metrics_count - 
                await db[METRICS_COLL].count_documents({
                    "meta.device_id": device_id,
                    "ts": {"$lt": cutoff_time}
                })
            )
            
            if metrics_to_keep < device_metrics_count:
                # Get the timestamp of the Nth most recent record
                keep_threshold = await db[METRICS_COLL].find(
                    {"meta.device_id": device_id}
                ).sort("ts", -1).skip(metrics_to_keep - 1).limit(1).to_list(1)
                
                if keep_threshold:
                    threshold_time = keep_threshold[0]["ts"]
                    result = await db[METRICS_COLL].delete_many({
                        "meta.device_id": device_id,
                        "ts": {"$lt": threshold_time}
                    })
                    total_metrics_deleted += result.deleted_count
        
        # Cleanup events
        events_result = await db[EVENTS_COLL].delete_many({
            "detected_at": {"$lt": cutoff_time}
        })
        events_deleted = events_result.deleted_count
        
        # Get final stats
        final_metrics_count = await db[METRICS_COLL].count_documents({})
        final_events_count = await db[EVENTS_COLL].count_documents({})
        
        return {
            "success": True,
            "message": "Cleanup completed",
            "stats": {
                "before": {"metrics": metrics_count, "events": events_count},
                "after": {"metrics": final_metrics_count, "events": final_events_count},
                "deleted": {"metrics": total_metrics_deleted, "events": events_deleted}
            },
            "config": {
                "keep_days": keep_days,
                "min_records_per_device": min_records,
                "cutoff_time": cutoff_time.isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(500, f"Cleanup failed: {str(e)}")

@app.get("/admin/stats")
async def get_database_stats():
    """Get database statistics"""
    try:
        metrics_count = await db[METRICS_COLL].count_documents({})
        events_count = await db[EVENTS_COLL].count_documents({})
        
        # Get date range
        oldest_metric = await db[METRICS_COLL].find_one({}, sort=[("ts", 1)])
        newest_metric = await db[METRICS_COLL].find_one({}, sort=[("ts", -1)])
        
        # Get device count
        devices = await db[METRICS_COLL].distinct("meta.device_id")
        
        return {
            "success": True,
            "stats": {
                "metrics": metrics_count,
                "events": events_count,
                "devices": len(devices),
                "date_range": {
                    "oldest": oldest_metric["ts"].isoformat() if oldest_metric else None,
                    "newest": newest_metric["ts"].isoformat() if newest_metric else None
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get stats: {str(e)}")
