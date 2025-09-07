import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';
import { detectLocationHierarchy, calculateDeviceDistribution, categorizeDeviceType } from '@/lib/location-utils';

interface LocationHealth {
  location: string;
  hierarchy: {
    country: string;
    city: string;
    office: string;
    fullPath: string;
  };
  deviceCount: number;
  healthyDevices: number;
  warningDevices: number;
  criticalDevices: number;
  lastSeen: Date | null;
  deviceDistribution: {
    switches: number;
    routers: number;
    pcs: number;
    interfaces: number;
    other: number;
  };
  devices: {
    hostid: string;
    device_id: string;
    status: string;
    severity: string;
    last_seen: Date;
    deviceType: string;
  }[];
}

interface HierarchicalLocation {
  level: 'country' | 'city' | 'office';
  name: string;
  path: string;
  deviceCount: number;
  healthyDevices: number;
  warningDevices: number;
  criticalDevices: number;
  lastSeen: Date | null;
  children: HierarchicalLocation[];
  deviceDistribution?: {
    switches: number;
    routers: number;
    pcs: number;
    interfaces: number;
    other: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location'); // Optional location filter

    const metricsCollection = await getCollection('metrics_ts');
    const eventsCollection = await getCollection('events');

    // Get all unique devices and their locations from metrics, excluding Zabbix server and devices without valid locations
    const devicesWithLocation = await metricsCollection.aggregate([
      {
        $match: {
          'meta.device_id': { 
            $not: { $regex: /zabbix|server/i } 
          },
          'meta.location': { 
            $exists: true, 
            $ne: null, 
            $ne: '', 
            $not: { $regex: /unknown location/i } 
          }
        }
      },
      {
        $group: {
          _id: {
            hostid: '$meta.hostid',
            device_id: '$meta.device_id',
            location: '$meta.location',
            geo: '$meta.geo'
          },
          last_seen: { $max: '$ts' }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id.hostid',
          device_id: '$_id.device_id',
          location: '$_id.location',
          geo: '$_id.geo',
          last_seen: 1
        }
      }
    ]).toArray();

    // Get latest alert status for each device
    const devicesWithAlerts = await eventsCollection.aggregate([
      {
        $group: {
          _id: '$hostid',
          latest_alert: {
            $first: {
              status: '$status',
              severity: '$severity',
              detected_at: '$detected_at'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          hostid: '$_id',
          status: '$latest_alert.status',
          severity: '$latest_alert.severity',
          last_alert: '$latest_alert.detected_at'
        }
      }
    ]).toArray();

    // Group devices by location and build hierarchy
    const locationMap = new Map<string, LocationHealth>();

    devicesWithLocation.forEach(device => {
      const locationKey = device.location && device.location !== '' ? device.location : 'Unknown Location';
      
      if (location && locationKey.toLowerCase() !== location.toLowerCase()) {
        return; // Skip if location filter doesn't match
      }

      if (!locationMap.has(locationKey)) {
        // Pass geo data along with location name
        const hierarchy = detectLocationHierarchy(locationKey, device.geo);
        locationMap.set(locationKey, {
          location: locationKey,
          hierarchy,
          deviceCount: 0,
          healthyDevices: 0,
          warningDevices: 0,
          criticalDevices: 0,
          lastSeen: null,
          deviceDistribution: {
            switches: 0,
            routers: 0,
            pcs: 0,
            interfaces: 0,
            other: 0
          },
          devices: []
        });
      }

      const locationData = locationMap.get(locationKey)!;
      const alertInfo = devicesWithAlerts.find(alert => alert.hostid === device.hostid);
      const deviceType = categorizeDeviceType(device.device_id);
      
      const deviceInfo = {
        hostid: device.hostid,
        device_id: device.device_id,
        status: alertInfo?.status || 'Operational',
        severity: alertInfo?.severity || 'info',
        last_seen: device.last_seen,
        deviceType
      };

      locationData.devices.push(deviceInfo);
      locationData.deviceCount++;
      locationData.deviceDistribution[deviceType]++;
      
      if (deviceInfo.severity === 'critical') {
        locationData.criticalDevices++;
      } else if (deviceInfo.severity === 'warning') {
        locationData.warningDevices++;
      } else {
        locationData.healthyDevices++;
      }

      if (!locationData.lastSeen || device.last_seen > locationData.lastSeen) {
        locationData.lastSeen = device.last_seen;
      }
    });

    const locations = Array.from(locationMap.values());

    // Build hierarchical structure
    const hierarchicalMap = new Map<string, HierarchicalLocation>();

    locations.forEach(location => {
      const { country, city, office } = location.hierarchy;
      
      // Build country level
      if (!hierarchicalMap.has(country)) {
        hierarchicalMap.set(country, {
          level: 'country',
          name: country,
          path: country === 'Unknown' ? '/locations' : `/${country.toLowerCase()}`,
          deviceCount: 0,
          healthyDevices: 0,
          warningDevices: 0,
          criticalDevices: 0,
          lastSeen: null,
          children: []
        });
      }
      
      const countryData = hierarchicalMap.get(country)!;
      
      // Build city level
      const cityKey = `${country}-${city}`;
      if (!hierarchicalMap.has(cityKey)) {
        hierarchicalMap.set(cityKey, {
          level: 'city',
          name: city,
          path: city === 'Unknown' ? `/${country.toLowerCase()}` : `/${country.toLowerCase()}/${city.toLowerCase()}`,
          deviceCount: 0,
          healthyDevices: 0,
          warningDevices: 0,
          criticalDevices: 0,
          lastSeen: null,
          children: []
        });
        
        countryData.children.push(hierarchicalMap.get(cityKey)!);
      }
      
      const cityData = hierarchicalMap.get(cityKey)!;
      
      // Build office level
      const officeKey = `${country}-${city}-${office}`;
      if (!hierarchicalMap.has(officeKey)) {
        hierarchicalMap.set(officeKey, {
          level: 'office',
          name: office,
          path: office === 'Main Office' ? `/${country.toLowerCase()}/${city.toLowerCase()}` : `/${country.toLowerCase()}/${city.toLowerCase()}/${office.toLowerCase()}`,
          deviceCount: 0,
          healthyDevices: 0,
          warningDevices: 0,
          criticalDevices: 0,
          lastSeen: null,
          children: [],
          deviceDistribution: {
            switches: 0,
            routers: 0,
            pcs: 0,
            interfaces: 0,
            other: 0
          }
        });
        
        cityData.children.push(hierarchicalMap.get(officeKey)!);
      }
      
      const officeData = hierarchicalMap.get(officeKey)!;
      
      // Aggregate data up the hierarchy
      officeData.deviceCount += location.deviceCount;
      officeData.healthyDevices += location.healthyDevices;
      officeData.warningDevices += location.warningDevices;
      officeData.criticalDevices += location.criticalDevices;
      officeData.deviceDistribution!.switches += location.deviceDistribution.switches;
      officeData.deviceDistribution!.routers += location.deviceDistribution.routers;
      officeData.deviceDistribution!.pcs += location.deviceDistribution.pcs;
      officeData.deviceDistribution!.interfaces += location.deviceDistribution.interfaces;
      officeData.deviceDistribution!.other += location.deviceDistribution.other;
      
      if (!officeData.lastSeen || (location.lastSeen && location.lastSeen > officeData.lastSeen)) {
        officeData.lastSeen = location.lastSeen;
      }
      
      // Aggregate to city level
      cityData.deviceCount += location.deviceCount;
      cityData.healthyDevices += location.healthyDevices;
      cityData.warningDevices += location.warningDevices;
      cityData.criticalDevices += location.criticalDevices;
      
      if (!cityData.lastSeen || (location.lastSeen && location.lastSeen > cityData.lastSeen)) {
        cityData.lastSeen = location.lastSeen;
      }
      
      // Aggregate to country level
      countryData.deviceCount += location.deviceCount;
      countryData.healthyDevices += location.healthyDevices;
      countryData.warningDevices += location.warningDevices;
      countryData.criticalDevices += location.criticalDevices;
      
      if (!countryData.lastSeen || (location.lastSeen && location.lastSeen > countryData.lastSeen)) {
        countryData.lastSeen = location.lastSeen;
      }
    });

    const hierarchicalLocations = Array.from(hierarchicalMap.values())
      .filter(loc => loc.level === 'country' && loc.name !== 'Unknown');

    // Filter out 'Unknown' cities and 'Main Office' offices within the hierarchy
    hierarchicalLocations.forEach(country => {
      country.children = country.children.filter(city => city.name !== 'Unknown');
      country.children.forEach(city => {
        city.children = city.children.filter(office => office.name !== 'Main Office');
      });
    });

    // If no location data found, return fallback data
    if (locations.length === 0) {
      return NextResponse.json({
        count: 0,
        locations: [],
        message: 'No location data found in monitoring data',
        fallback: {
          globalHealth: [
            { name: "Healthy", value: 0 },
            { name: "Warning", value: 0 },
            { name: "Critical", value: 0 }
          ],
          totalDevices: 0,
          lastSeen: null
        }
      });
    }

    return NextResponse.json({
      count: hierarchicalLocations.length,
      locations: locations,
      hierarchy: hierarchicalLocations,
      filters: {
        location: location
      }
    });

  } catch (error) {
    console.error('Error fetching location data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location data' },
      { status: 500 }
    );
  }
}
