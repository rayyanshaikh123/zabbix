# MongoDB Configuration for NetMon

## Database Configuration

Your monitoring system is now configured to use the **"netmon"** database on your MongoDB cluster.

## Environment Variables Setup

### Frontend Configuration
Create a `.env.local` file in the `frontend/` directory with:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=netmon

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Backend Configuration
The backend is already configured to use:
- **Database**: `netmon`
- **Collections**: 
  - `metrics_ts` (time series metrics)
  - `events` (alerts and notifications)

### Agent Configuration
The agent sends data to the backend API, which automatically stores it in the `netmon` database.

## Collections Structure

### metrics_ts Collection
```json
{
  "_id": "ObjectId",
  "ts": 1703123456,
  "meta": {
    "device_id": "Cisco_R1",
    "hostid": "12345",
    "ifindex": "1",
    "ifdescr": "Fa0/0",
    "geo": {}
  },
  "metric": "Interface Fa0/0(): Bits received",
  "value": 480,
  "value_type": "counter"
}
```

### events Collection
```json
{
  "_id": "ObjectId",
  "device_id": "Cisco_R1",
  "hostid": "12345",
  "iface": "Fa0/0",
  "metric": "Interface Fa0/0(): Operational status",
  "value": "1",
  "status": "OK",
  "severity": "info",
  "detected_at": 1703123456,
  "evidence": {},
  "labels": []
}
```

## Setup Steps

1. **Update MongoDB URI**: Replace the placeholder in `.env.local` with your actual cluster connection string
2. **Start Backend**: `cd backend && python main.py`
3. **Start Agent**: `cd agent && python zabbix_network_agent_with_ingest.py`
4. **Start Frontend**: `cd frontend && npm run dev`

## Verification

Check that data is being stored by:
1. Opening MongoDB Compass or Atlas UI
2. Connecting to your cluster
3. Navigating to the `netmon` database
4. Checking the `metrics_ts` and `events` collections

Your monitoring data will now be stored in the `netmon` database on your MongoDB cluster!
