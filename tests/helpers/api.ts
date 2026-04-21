// Direct API helpers that mirror usePlaces / useGeocoding logic without React hooks.
import https from 'node:https';
import type { ActivityTag, City } from '../../src/data/cities';
import { inferTags } from '../../src/data/cities';
import { haversineKm, buildOverpassQuery } from '../../src/lib/geoUtils';

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

function httpsPostOnce(url: string, body: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(body, 'utf8');
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': bodyBuf.byteLength,
        },
      },
      (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`Overpass ${res.statusCode}: ${res.statusMessage}`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      },
    );
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function httpsPost(url: string, body: string, headers: Record<string, string>): Promise<string> {
  const RETRY_DELAYS_MS = [30_000, 60_000];
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await httpsPostOnce(url, body, headers);
    } catch (err) {
      lastError = err as Error;
      const isRetriable = lastError.message.includes('429') || lastError.message.includes('504');
      if (!isRetriable || attempt === RETRY_DELAYS_MS.length) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

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

  const rawBody = await httpsPost(
    'https://overpass-api.de/api/interpreter',
    `data=${encodeURIComponent(query)}`,
    { 'Content-Type': 'application/x-www-form-urlencoded' },
  );
  const data = JSON.parse(rawBody) as { elements: OverpassElement[] };

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
