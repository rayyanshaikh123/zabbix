# MongoDB Setup Guide

## Quick Fix for Database Connection Error

The error you're seeing is due to MongoDB not being properly configured. Here are the steps to fix it:

### Option 1: Use Local MongoDB (Recommended for Development)

1. **Install MongoDB locally:**
   ```bash
   # Windows (using Chocolatey)
   choco install mongodb
   
   # Or download from: https://www.mongodb.com/try/download/community
   ```

2. **Start MongoDB service:**
   ```bash
   # Windows
   net start MongoDB
   
   # Or start manually
   mongod --dbpath C:\data\db
   ```

3. **Create environment file:**
   Create `frontend/.env.local` with:
   ```bash
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=netmon
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

### Option 2: Use MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas account:** https://www.mongodb.com/atlas
2. **Create a free cluster**
3. **Get connection string** from Atlas dashboard
4. **Create `frontend/.env.local` with:**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=netmon
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

### Option 3: Use Docker (Alternative)

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Create environment file
echo "MONGODB_URI=mongodb://localhost:27017" > frontend/.env.local
echo "MONGODB_DB=netmon" >> frontend/.env.local
echo "NEXT_PUBLIC_BASE_URL=http://localhost:3000" >> frontend/.env.local
```

## After Setup

1. **Restart your Next.js development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test the connection** by trying to create an office

## Current Status

✅ **Error Handling Improved**: The office creation form now shows a user-friendly error message when MongoDB is not available

✅ **Graceful Degradation**: You can still create offices even when the database is not connected

✅ **Better Connection Options**: MongoDB connection now handles SSL issues and timeouts better

The application will work even without MongoDB - you just won't be able to fetch device lists or save office data until the database is properly configured.
