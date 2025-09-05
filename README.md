# Zabbix Network Monitoring Dashboard

A comprehensive network monitoring dashboard built with Next.js 14, featuring real-time data visualization, authentication, and MongoDB integration for Zabbix network monitoring data.

## 🚀 Features

### ✅ Core Functionality
- **Real-time Network Monitoring** - Live data from Zabbix agents
- **Interactive Dashboard** - Modern UI with charts and metrics
- **Location-based Monitoring** - Geographic drill-down capabilities
- **Device Health Tracking** - Monitor switches, routers, PCs, and interfaces
- **Alert Management** - Real-time alerts and notifications

### 🔐 Authentication & Security
- **NextAuth Integration** - Secure authentication system
- **Role-based Access Control** - Admin and user roles
- **Protected Routes** - Middleware-based route protection
- **Session Management** - JWT-based secure sessions

### 📊 Data Visualization
- **Health Charts** - Visual representation of device health
- **Time Series Data** - Historical metrics and trends
- **Geographic Maps** - Location-based device distribution
- **Real-time Updates** - Live data from MongoDB collections

### 🏗️ Architecture
- **Next.js 14** - App Router with server components
- **MongoDB Atlas** - Cloud database with time series collections
- **TypeScript** - Full type safety
- **Tailwind CSS** - Modern responsive design
- **shadcn/ui** - Beautiful UI components

## 📁 Project Structure

```
zabbix-monitoring-dashboard/
├── frontend/                    # Next.js application
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── admin/          # Admin-only endpoints
│   │   │   ├── ingest/         # Data ingestion (for agents)
│   │   │   └── [other]/        # Monitoring endpoints
│   │   ├── auth/               # Authentication pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── locations/          # Geographic monitoring
│   │   └── admin/              # Admin panel
│   ├── components/             # Reusable components
│   ├── lib/                    # Utilities and configurations
│   └── public/                 # Static assets
├── agent/                      # Python Zabbix agent
│   ├── zabbix_network_agent_with_ingest.py
│   └── requirements.txt
└── backend/                    # FastAPI backend (optional)
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Python 3.8+ (for agent)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd zabbix-monitoring-dashboard
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Create `.env.local` in the frontend directory:
```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxfzbq2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=netmon

# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=http://localhost:3000

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. MongoDB Setup
Run the Atlas setup script:
```bash
node setup-atlas.js
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and create your first account.

## 🔧 Configuration

### Database Collections
- `users` - User authentication data
- `metrics_ts` - Time series metrics (geographic + device data)
- `events` - Alert and event data

### Agent Integration
The Python agent sends data to:
- `POST /api/ingest/metrics` - Device metrics and health data
- `POST /api/ingest/events` - Alerts and notifications

## 🚀 Usage

### 1. User Registration
- Visit `/auth/signup` to create an account
- Admin users can promote other users via the admin panel

### 2. Dashboard Overview
- **Real-time Metrics** - Live device counts and health status
- **Geographic View** - Location-based device distribution
- **Health Monitoring** - Visual health status of all devices

### 3. Location Drill-down
- **Global View** - Countries with device counts
- **City Level** - Cities within selected country
- **Office Level** - Individual offices with device details

### 4. Device Monitoring
- **Device Types** - Switches, routers, PCs, interfaces
- **Health Status** - Healthy, Warning, Critical
- **Real-time Updates** - Live data from agent

## 🔐 Authentication

### User Roles
- **User** - Basic dashboard access
- **Admin** - Full access including user management

### Protected Routes
All routes except authentication pages are protected by middleware.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Data Ingestion (Agent)
- `POST /api/ingest/metrics` - Device metrics
- `POST /api/ingest/events` - Alerts and events

### Dashboard Data
- `GET /api/hosts` - Monitored hosts
- `GET /api/hosts/[id]` - Host details
- `GET /api/metrics/[hostid]` - Host metrics
- `GET /api/alerts` - System alerts
- `GET /api/locations` - Geographic data

### Admin (Protected)
- `GET /api/admin/users` - User management
- `POST /api/admin/promote` - Promote users

## 🤖 Zabbix Agent

### Setup
```bash
cd agent
pip install -r requirements.txt
```

### Configuration
Set environment variables:
```bash
export ZABBIX_URL="http://your-zabbix-server/zabbix/api_jsonrpc.php"
export ZABBIX_API_TOKEN="your-api-token"
export BACKEND_URL="http://localhost:3000"
```

### Running the Agent
```bash
python zabbix_network_agent_with_ingest.py
```

## 🧪 Testing

### Manual Testing
1. Start the Next.js development server
2. Create a user account
3. Navigate through the dashboard
4. Check real-time data updates

### Agent Testing
1. Start the Python agent
2. Monitor data flow in MongoDB Atlas
3. Verify dashboard updates with live data

## 🚀 Deployment

### Environment Variables for Production
```bash
MONGODB_URI=mongodb+srv://prod-connection-string
NEXTAUTH_SECRET=secure-random-key
NEXTAUTH_URL=https://your-domain.com
```

### Build Commands
```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation files
- Review the code comments
- Open an issue on GitHub

---

**Built with ❤️ using Next.js, MongoDB Atlas, and Zabbix**
