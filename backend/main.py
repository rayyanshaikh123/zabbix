# backend/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from motor.motor_asyncio import AsyncIOMotorClient
import os, time, datetime

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "netmon")
METRICS_COLL = os.environ.get("METRICS_COLL", "metrics_ts")
EVENTS_COLL = os.environ.get("EVENTS_COLL", "events")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="NetMon Ingest API")

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
