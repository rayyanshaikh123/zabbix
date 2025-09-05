# backend/setup_timeseries.py
from pymongo import MongoClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "netmon")
METRICS_COLL = os.environ.get("METRICS_COLL", "metrics_ts")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

if METRICS_COLL in db.list_collection_names():
    print("Time-series collection already exists.")
else:
    db.create_collection(
        METRICS_COLL,
        timeseries={
            "timeField": "ts",
            "metaField": "meta",
            "granularity": "seconds"
        }
    )
    print("Created time-series collection:", METRICS_COLL)

# Create helpful indexes
db[METRICS_COLL].create_index([("meta.device_id", 1), ("metric", 1)])
db["events"].create_index([("device_id", 1), ("detected_at", -1)])
print("Indexes created.")
