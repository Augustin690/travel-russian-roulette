// Direct API helpers that mirror usePlaces / useGeocoding logic without React hooks.
import type { ActivityTag, City } from '../../src/data/cities';
import { inferTags } from '../../src/data/cities';
import { haversineKm, buildOverpassQuery } from '../../src/lib/geoUtils';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function fetchPlaces(
  lat: number,
  lng: number,
  radiusKm: number,
  activities: ActivityTag[] = [],
): Promise<City[]> {
  const query = buildOverpassQuery(lat, lng, radiusKm * 1000);

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass ${res.status}: ${res.statusText}`);
  const data = (await res.json()) as { elements: OverpassElement[] };

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const places: City[] = [];

  for (const el of data.elements) {
    const osmId = `${el.type}/${el.id}`;
    if (seenIds.has(osmId)) continue;
    seenIds.add(osmId);

    const osm = el.tags ?? {};
    const name = osm.name?.trim();
    if (!name || name.length < 2) continue;

    const elLat = el.type === 'node' ? el.lat : el.center?.lat;
    const elLng = el.type === 'node' ? el.lon : el.center?.lon;
    if (elLat === undefined || elLng === undefined) continue;

    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);

    const tags = inferTags(osm);
    if (activities.length > 0 && !tags.some((t) => activities.includes(t))) continue;

    places.push({
      id: osmId,
      name,
      lat: elLat,
      lng: elLng,
      distanceKm: Math.round(haversineKm(lat, lng, elLat, elLng)),
      tags,
      osmTags: osm,
    });
  }

  return places;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeCity(query: string): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    addressdetails: '0',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      'User-Agent': 'travel-roulette-test/1.0 (automated test suite)',
      'Accept-Language': 'en',
    },
  });

  if (!res.ok) throw new Error(`Nominatim ${res.status}: ${res.statusText}`);
  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (results.length === 0) return null;
  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
