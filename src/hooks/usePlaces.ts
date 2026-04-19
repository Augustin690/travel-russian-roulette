import { useEffect, useRef, useState } from 'react';
import { inferTags, type ActivityTag, type City } from '../data/cities';

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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildQuery(lat: number, lng: number, radiusM: number): string {
  const a = `(around:${radiusM},${lat},${lng})`;
  return `[out:json][timeout:30];
(
  node["name"]["tourism"~"^(attraction|viewpoint|museum|gallery|theme_park|zoo|aquarium)$"]${a};
  node["name"]["historic"~"^(castle|ruins|monument|memorial|archaeological_site|fort|tower|city_gate)$"]${a};
  node["name"]["natural"~"^(peak|beach|cave_entrance|hot_spring|waterfall|volcano)$"]${a};
  node["name"]["leisure"~"^(nature_reserve|garden)$"]${a};
  way["name"]["tourism"~"^(attraction|museum|gallery|viewpoint)$"]${a};
  way["name"]["historic"~"^(castle|ruins|monument|archaeological_site|fort)$"]${a};
  way["name"]["natural"="beach"]${a};
  way["name"]["leisure"~"^(nature_reserve|garden)$"]${a};
);
out center tags 100;`;
}

export function usePlaces(origin: Origin | null, filters: PlacesFilters) {
  const [state, setState] = useState<State>({ places: [], status: 'idle', error: null });
  const activitiesKey = [...filters.activities].sort().join(',');
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!origin) {
      setState({ places: [], status: 'idle', error: null });
      return;
    }

    // Debounce: cancel pending timeout and in-flight request on rapid changes.
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    setState((s) => ({ ...s, status: 'loading', error: null }));

    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = setTimeout(() => {
      const radiusM = filters.radiusKm * 1000;
      const query = buildQuery(origin.lat, origin.lng, radiusM);

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
          // Deduplicate by type/id (unique OSM identity) to avoid collisions
          // between features that share a name across different elements or languages.
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

            const lat = el.type === 'node' ? el.lat : el.center?.lat;
            const lng = el.type === 'node' ? el.lon : el.center?.lon;
            if (lat === undefined || lng === undefined) continue;

            // Secondary dedupe: drop features with identical display names that are
            // very close together (same place mapped as both node and way).
            const nameKey = name.toLowerCase();
            if (seenNames.has(nameKey)) continue;
            seenNames.add(nameKey);

            const tags = inferTags(osm);

            if (
              filters.activities.length > 0 &&
              !tags.some((t) => filters.activities.includes(t))
            ) continue;

            places.push({
              id: osmId,
              name,
              lat,
              lng,
              distanceKm: Math.round(haversineKm(origin.lat, origin.lng, lat, lng)),
              tags,
              osmTags: osm,
            });
          }

          setState({ places, status: 'ready', error: null });
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
