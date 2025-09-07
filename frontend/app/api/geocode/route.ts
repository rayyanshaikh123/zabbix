import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NOMINATIM_REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const url = NOMINATIM_REVERSE_GEOCODE_URL.replace('{lat}', lat).replace('{lon}', lon);
    // Include a User-Agent header to comply with Nominatim usage policy
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'ZabbixNetmonDashboard/1.0 (contact@example.com)'
      }
    });

    const data = response.data;
    const address = data.address || {};

    const geocoded_address = {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      country: address.country || null,
      city: address.city || address.town || address.village || null,
      office: address.building || address.office || address.commercial || address.amenity || null,
      display_name: data.display_name || null,
      source: "nominatim_reverse_geocode"
    };

    return NextResponse.json(geocoded_address);
  } catch (error) {
    console.error(`Error during reverse geocoding for ${lat},${lon}:`, error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: `Geocoding failed: ${error.response?.status} - ${error.response?.statusText}`, details: error.response?.data },
        { status: error.response?.status || 500 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to perform reverse geocoding', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }
}
