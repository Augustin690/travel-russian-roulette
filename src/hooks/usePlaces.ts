import { useEffect, useRef, useState } from 'react';
import { inferTags, type ActivityTag, type City } from '../data/cities';
import { haversineKm } from '../lib/geoUtils';

export interface Origin {
  lat: number;
  lng: number;
  displayName: string;
}

export interface PlacesFilters {
  radiusKm: number;
  activities: ActivityTag[];
}

interface State {
  places: City[];
  status: 'idle' | 'loading' | 'error' | 'ready';
  error: string | null;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_DEBOUNCE_MS = 400;
const SAMPLE_SIZE = 50;
const FETCH_LIMIT = 70;
// When the new radius exceeds this multiple of the cached radius, do a full
// refetch instead of an annulus query (huge rings aren't worth the complexity).
const ANNULUS_MAX_RATIO = 2;

// Returns Overpass QL clauses for all tracked tag types, using the given area filter.
const tagClauses = (area: string) =>
  `  node["name"]["tourism"~"^(attraction|viewpoint|museum|gallery|theme_park|zoo|aquarium)$"]${area};
  node["name"]["historic"~"^(castle|ruins|monument|memorial|archaeological_site|fort|tower|city_gate)$"]${area};
  node["name"]["natural"~"^(peak|beach|cave_entrance|hot_spring|waterfall|volcano)$"]${area};
  node["name"]["leisure"~"^(nature_reserve|garden)$"]${area};
  way["name"]["tourism"~"^(attraction|museum|gallery|viewpoint)$"]${area};
  way["name"]["historic"~"^(castle|ruins|monument|archaeological_site|fort)$"]${area};
  way["name"]["natural"="beach"]${area};
  way["name"]["leisure"~"^(nature_reserve|garden)$"]${area};`;

// Builds a full-disk or annulus (outerM minus innerM) Overpass query.
function buildQuery(lat: number, lng: number, outerM: number, innerM?: number): string {
  const outerArea = `(around:${outerM},${lat},${lng})`;
  const body = innerM
    ? `(\n${tagClauses(outerArea)}\n) - (\n${tagClauses(`(around:${innerM},${lat},${lng})`)}\n);`
    : `(\n${tagClauses(outerArea)}\n);`;
  return `[out:json][timeout:30];\n${body}\nout center ${FETCH_LIMIT};`;
}

// Parses raw Overpass elements into City objects, deduplicating against seenIds/seenNames
// (which are mutated in place so the caller's sets stay in sync with the cache).
function parseElements(
  elements: OverpassElement[],
  originLat: number,
  originLng: number,
  seenIds: Set<string>,
  seenNames: Set<string>,
): City[] {
  const places: City[] = [];
  for (const el of elements) {
    const osmId = `${el.type}/${el.id}`;
    if (seenIds.has(osmId)) continue;

    const osm = el.tags ?? {};
    const name = osm.name?.trim();
    if (!name || name.length < 2) continue;

    const lat = el.type === 'node' ? el.lat : el.center?.lat;
    const lng = el.type === 'node' ? el.lon : el.center?.lon;
    if (lat === undefined || lng === undefined) continue;

    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) continue;

    seenIds.add(osmId);
    seenNames.add(nameKey);

    places.push({
      id: osmId,
      name,
      lat,
      lng,
      distanceKm: Math.round(haversineKm(originLat, originLng, lat, lng)),
      tags: inferTags(osm),
      osmTags: osm,
    });
  }
  return places;
}

// Filters the cache by radius + activities, then returns a random sample of SAMPLE_SIZE.
function samplePlaces(places: City[], radiusKm: number, activities: ActivityTag[]): City[] {
  let pool = places.filter((p) => p.distanceKm <= radiusKm);
  if (activities.length > 0) {
    pool = pool.filter((p) => p.tags.some((t) => activities.includes(t)));
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, SAMPLE_SIZE);
}

export function usePlaces(origin: Origin | null, filters: PlacesFilters) {
  const [state, setState] = useState<State>({ places: [], status: 'idle', error: null });
  const activitiesKey = [...filters.activities].sort().join(',');

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cache: all deduplicated City objects fetched so far for the current origin.
  const cachedPlacesRef = useRef<City[]>([]);
  const cachedIdsRef = useRef<Set<string>>(new Set());
  const cachedNamesRef = useRef<Set<string>>(new Set());
  // The maximum radius (km) that the cache covers.
  const fetchedRadiusKmRef = useRef<number>(0);
  const fetchedOriginKeyRef = useRef<string>('');

  useEffect(() => {
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!origin) {
      cachedPlacesRef.current = [];
      cachedIdsRef.current = new Set();
      cachedNamesRef.current = new Set();
      fetchedRadiusKmRef.current = 0;
      fetchedOriginKeyRef.current = '';
      setState({ places: [], status: 'idle', error: null });
      return;
    }

    const oKey = `${origin.lat},${origin.lng}`;
    const sameOrigin = oKey === fetchedOriginKeyRef.current;
    const hasCachedData = sameOrigin && cachedPlacesRef.current.length > 0;

    // Radius shrunk (or unchanged) within the cached range, or only activities changed:
    // re-filter and re-sample the cache — no network call needed.
    if (hasCachedData && filters.radiusKm <= fetchedRadiusKmRef.current) {
      setState({
        places: samplePlaces(cachedPlacesRef.current, filters.radiusKm, filters.activities),
        status: 'ready',
        error: null,
      });
      return;
    }

    // Radius grew: use an annulus query if within 2× the cached radius,
    // otherwise reset the cache and do a full refetch.
    const useAnnulus =
      hasCachedData && filters.radiusKm <= fetchedRadiusKmRef.current * ANNULUS_MAX_RATIO;

    if (!useAnnulus) {
      cachedPlacesRef.current = [];
      cachedIdsRef.current = new Set();
      cachedNamesRef.current = new Set();
      fetchedRadiusKmRef.current = 0;
      fetchedOriginKeyRef.current = oKey;
    }

    setState((s) => ({ ...s, status: 'loading', error: null }));

    const controller = new AbortController();
    abortRef.current = controller;

    const outerM = filters.radiusKm * 1000;
    const innerM = useAnnulus ? fetchedRadiusKmRef.current * 1000 : undefined;
    const query = buildQuery(origin.lat, origin.lng, outerM, innerM);

    debounceRef.current = setTimeout(() => {
      fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Overpass error ${res.status}`);
          return res.json() as Promise<{ elements: OverpassElement[] }>;
        })
        .then((data) => {
          const newPlaces = parseElements(
            data.elements,
            origin.lat,
            origin.lng,
            cachedIdsRef.current,
            cachedNamesRef.current,
          );
          cachedPlacesRef.current = [...cachedPlacesRef.current, ...newPlaces];
          fetchedRadiusKmRef.current = filters.radiusKm;
          fetchedOriginKeyRef.current = oKey;

          setState({
            places: samplePlaces(cachedPlacesRef.current, filters.radiusKm, filters.activities),
            status: 'ready',
            error: null,
          });
        })
        .catch((err: Error) => {
          if (err.name === 'AbortError') return;
          setState({
            places: [],
            status: 'error',
            error: 'Could not load places — check your connection and try again.',
          });
        });
    }, OVERPASS_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceRef.current);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, filters.radiusKm, activitiesKey]);

  return state;
}
