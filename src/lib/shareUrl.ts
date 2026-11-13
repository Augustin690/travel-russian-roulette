import { haversineKm } from './geoUtils';
import type { ActivityTag, City } from '../data/cities';
import type { Origin, PlacesFilters } from '../hooks/usePlaces';

export interface SharedSpin {
  origin: Origin;
  filters: PlacesFilters;
  place: City;
}

const OSM_TYPES = ['node', 'way', 'relation'] as const;

const TAG_ORDER: ActivityTag[] = [
  'historic',
  'nature',
  'museum',
  'beach',
  'mountain',
  'cultural',
  'viewpoint',
];

const FILTER_CODES: Record<ActivityTag, string> = {
  historic: 'hi',
  nature: 'na',
  museum: 'mu',
  beach: 'be',
  mountain: 'mo',
  cultural: 'cu',
  viewpoint: 'vi',
};

const CODE_TAGS = new Map<string, ActivityTag>(
  TAG_ORDER.map((tag) => [FILTER_CODES[tag], tag]),
);

const RADIUS_MIN_KM = 20;
const RADIUS_MAX_KM = 300;

const coord = (n: number) => n.toFixed(5);

function splitOsmId(id: string): { type: string; id: string } {
  const slash = id.indexOf('/');
  if (slash < 0) return { type: 'node', id };
  return { type: id.slice(0, slash), id: id.slice(slash + 1) };
}

export function buildShareQuery({ origin, filters, place }: SharedSpin): string {
  const params = new URLSearchParams();
  params.set('c', origin.displayName);
  params.set('ola', coord(origin.lat));
  params.set('oln', coord(origin.lng));
  params.set('r', String(filters.radiusKm));

  const active = TAG_ORDER.filter((tag) => filters.activities.includes(tag));
  if (active.length > 0) {
    params.set('f', active.map((tag) => FILTER_CODES[tag]).join(','));
  }

  const { type, id } = splitOsmId(place.id);
  params.set('pt', type);
  params.set('pid', id);
  params.set('n', place.name);
  params.set('pla', coord(place.lat));
  params.set('pln', coord(place.lng));
  params.set('cat', place.tags[0] ?? 'cultural');

  return `?${params.toString()}`;
}

function parseNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseLat(raw: string | null): number | null {
  const n = parseNumber(raw);
  return n !== null && n >= -90 && n <= 90 ? n : null;
}

function parseLng(raw: string | null): number | null {
  const n = parseNumber(raw);
  return n !== null && n >= -180 && n <= 180 ? n : null;
}

function isActivityTag(value: string | null): value is ActivityTag {
  return value !== null && (TAG_ORDER as string[]).includes(value);
}

function parseFilters(raw: string | null): ActivityTag[] {
  if (!raw) return [];
  const tags: ActivityTag[] = [];
  for (const code of raw.split(',')) {
    const tag = CODE_TAGS.get(code.trim());
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function parseShareQuery(search: string): SharedSpin | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    const displayName = params.get('c')?.trim() ?? '';
    const name = params.get('n')?.trim() ?? '';
    if (!displayName || !name) return null;

    const originLat = parseLat(params.get('ola'));
    const originLng = parseLng(params.get('oln'));
    const placeLat = parseLat(params.get('pla'));
    const placeLng = parseLng(params.get('pln'));
    if (originLat === null || originLng === null || placeLat === null || placeLng === null) {
      return null;
    }

    const radiusKm = parseNumber(params.get('r'));
    if (radiusKm === null || radiusKm < RADIUS_MIN_KM || radiusKm > RADIUS_MAX_KM) return null;

    const osmType = params.get('pt');
    if (!osmType || !(OSM_TYPES as readonly string[]).includes(osmType)) return null;

    const osmId = params.get('pid') ?? '';
    if (!/^\d+$/.test(osmId) || Number(osmId) <= 0) return null;

    const category = params.get('cat');
    if (!isActivityTag(category)) return null;

    const place: City = {
      id: `${osmType}/${osmId}`,
      name,
      lat: placeLat,
      lng: placeLng,
      distanceKm: Math.round(haversineKm(originLat, originLng, placeLat, placeLng)),
      tags: [category],
      osmTags: {},
    };

    return {
      origin: { lat: originLat, lng: originLng, displayName },
      filters: { radiusKm, activities: parseFilters(params.get('f')) },
      place,
    };
  } catch {
    return null;
  }
}
