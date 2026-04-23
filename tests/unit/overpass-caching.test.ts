import { describe, it, expect, beforeEach } from 'vitest';
import type { City, ActivityTag } from '../../src/data/cities';

// These functions are extracted from usePlaces.ts and tested directly
// since they contain the core caching logic

const SAMPLE_SIZE = 50;

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Extracted from usePlaces.ts for testing
const tagClauses = (area: string) =>
  `  node["name"]["tourism"~"^(attraction|viewpoint|museum|gallery|theme_park|zoo|aquarium)$"]${area};
  node["name"]["historic"~"^(castle|ruins|monument|memorial|archaeological_site|fort|tower|city_gate)$"]${area};
  node["name"]["natural"~"^(peak|beach|cave_entrance|hot_spring|waterfall|volcano)$"]${area};
  node["name"]["leisure"~"^(nature_reserve|garden)$"]${area};
  way["name"]["tourism"~"^(attraction|museum|gallery|viewpoint)$"]${area};
  way["name"]["historic"~"^(castle|ruins|monument|archaeological_site|fort)$"]${area};
  way["name"]["natural"="beach"]${area};
  way["name"]["leisure"~"^(nature_reserve|garden)$"]${area};`;

function buildQuery(lat: number, lng: number, outerM: number, innerM?: number): string {
  const outerArea = `(around:${outerM},${lat},${lng})`;
  const body = innerM
    ? `(\n${tagClauses(outerArea)}\n) - (\n${tagClauses(`(around:${innerM},${lat},${lng})`)}\n);`
    : `(\n${tagClauses(outerArea)}\n);`;
  return `[out:json][timeout:30];\n${body}\nout center 70;`;
}

function parseElements(
  elements: OverpassElement[],
  originLat: number,
  originLng: number,
  seenIds: Set<string>,
  seenNames: Set<string>,
): City[] {
  const places: City[] = [];
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

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
      tags: [],
      osmTags: osm,
    });
  }
  return places;
}

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

describe('Overpass Caching – buildQuery', () => {
  it('builds a full-disk query when innerM is undefined', () => {
    const query = buildQuery(51.5, -0.1, 50000);
    expect(query).toContain('[out:json]');
    expect(query).toContain('[timeout:30]');
    expect(query).toContain('around:50000,51.5,-0.1');
    // Full disk: should not have subtraction
    expect(query).not.toContain(') - (');
  });

  it('builds an annulus query when innerM is provided', () => {
    const query = buildQuery(51.5, -0.1, 50000, 25000);
    expect(query).toContain('[out:json]');
    expect(query).toContain('around:50000,51.5,-0.1'); // outer radius
    expect(query).toContain('around:25000,51.5,-0.1'); // inner radius
    expect(query).toContain(') - ('); // annulus subtraction
  });

  it('includes all tag categories', () => {
    const query = buildQuery(0, 0, 5000);
    // Tourism
    for (const tag of ['museum', 'attraction', 'viewpoint', 'gallery', 'theme_park', 'zoo', 'aquarium']) {
      expect(query).toContain(tag);
    }
    // Historic
    for (const tag of ['castle', 'ruins', 'monument', 'memorial', 'archaeological_site', 'fort', 'tower', 'city_gate']) {
      expect(query).toContain(tag);
    }
    // Natural
    for (const tag of ['peak', 'beach', 'cave_entrance', 'hot_spring', 'waterfall', 'volcano']) {
      expect(query).toContain(tag);
    }
    // Leisure
    for (const tag of ['nature_reserve', 'garden']) {
      expect(query).toContain(tag);
    }
  });

  it('specifies out format as center with 70 result limit', () => {
    const query = buildQuery(0, 0, 1000);
    expect(query).toContain('out center 70');
  });

  it('correctly formats coordinates in the right order (lat,lng)', () => {
    const query = buildQuery(40.7128, -74.006, 10000);
    expect(query).toContain('around:10000,40.7128,-74.006');
  });

  it('handles negative coordinates (southern/western hemisphere)', () => {
    const query = buildQuery(-33.8688, -70.6753, 20000);
    expect(query).toContain('around:20000,-33.8688,-70.6753');
  });

  it('handles zero coordinates', () => {
    const query = buildQuery(0, 0, 1000);
    expect(query).toContain('around:1000,0,0');
  });
});

describe('Overpass Caching – parseElements', () => {
  let seenIds: Set<string>;
  let seenNames: Set<string>;

  beforeEach(() => {
    seenIds = new Set();
    seenNames = new Set();
  });

  it('parses node elements with coordinates', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Big Ben' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Big Ben');
    expect(places[0].id).toBe('node/1');
    expect(places[0].lat).toBe(51.5);
    expect(places[0].lng).toBe(-0.1);
  });

  it('parses way elements using center coordinates', () => {
    const elements: OverpassElement[] = [
      { type: 'way', id: 2, center: { lat: 51.5, lon: -0.1 }, tags: { name: 'Thames' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Thames');
    expect(places[0].id).toBe('way/2');
  });

  it('calculates distance from origin', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.6, lon: -0.1, tags: { name: 'North' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places[0].distanceKm).toBeGreaterThan(0);
    expect(places[0].distanceKm).toBeLessThan(20); // roughly 11 km
  });

  it('deduplicates by OSM ID', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Big Ben' } },
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Big Ben' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(1);
  });

  it('deduplicates by name (case-insensitive)', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Big Ben' } },
      { type: 'node', id: 2, lat: 51.51, lon: -0.1, tags: { name: 'big ben' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(1);
  });

  it('respects pre-populated seenIds', () => {
    seenIds.add('node/1');
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Big Ben' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(0);
  });

  it('respects pre-populated seenNames', () => {
    seenNames.add('big ben');
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Big Ben' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(0);
  });

  it('skips elements with missing name tag', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: {} },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(0);
  });

  it('skips elements with names shorter than 2 characters', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'A' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(0);
  });

  it('trims whitespace from names', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: '  Big Ben  ' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places[0].name).toBe('Big Ben');
  });

  it('skips nodes without lat/lon', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, tags: { name: 'Incomplete' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(0);
  });

  it('skips ways without center', () => {
    const elements: OverpassElement[] = [
      { type: 'way', id: 1, tags: { name: 'Incomplete Way' } },
    ];
    const places = parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(places).toHaveLength(0);
  });

  it('mutates seenIds and seenNames in place', () => {
    const elements: OverpassElement[] = [
      { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Big Ben' } },
    ];
    const initialIdSize = seenIds.size;
    const initialNameSize = seenNames.size;
    parseElements(elements, 51.5, -0.1, seenIds, seenNames);
    expect(seenIds.size).toBe(initialIdSize + 1);
    expect(seenNames.size).toBe(initialNameSize + 1);
  });
});

describe('Overpass Caching – samplePlaces', () => {
  let places: City[];

  beforeEach(() => {
    places = [
      { id: 'node/1', name: 'Museum A', lat: 51.5, lng: -0.1, distanceKm: 5, tags: ['museum'], osmTags: {} },
      { id: 'node/2', name: 'Museum B', lat: 51.51, lng: -0.1, distanceKm: 10, tags: ['museum'], osmTags: {} },
      { id: 'node/3', name: 'Beach A', lat: 51.52, lng: -0.1, distanceKm: 20, tags: ['beach'], osmTags: {} },
      { id: 'node/4', name: 'Peak A', lat: 51.53, lng: -0.1, distanceKm: 50, tags: ['mountain'], osmTags: {} },
      { id: 'node/5', name: 'Castle', lat: 51.54, lng: -0.1, distanceKm: 100, tags: ['historic'], osmTags: {} },
    ];
  });

  it('filters places by radius', () => {
    const sampled = samplePlaces(places, 30, []);
    for (const p of sampled) {
      expect(p.distanceKm).toBeLessThanOrEqual(30);
    }
  });

  it('returns at most SAMPLE_SIZE places', () => {
    const sampled = samplePlaces(places, 1000, []);
    expect(sampled.length).toBeLessThanOrEqual(SAMPLE_SIZE);
  });

  it('returns all places when fewer than SAMPLE_SIZE match', () => {
    const sampled = samplePlaces(places, 30, []);
    expect(sampled.length).toBe(3); // Museum A, Museum B, Beach A
  });

  it('filters by activity tag', () => {
    const sampled = samplePlaces(places, 1000, ['museum']);
    for (const p of sampled) {
      expect(p.tags).toContain('museum');
    }
  });

  it('filters by multiple activity tags (OR logic)', () => {
    const sampled = samplePlaces(places, 1000, ['museum', 'beach']);
    for (const p of sampled) {
      expect(p.tags.some((t) => ['museum', 'beach'].includes(t))).toBe(true);
    }
  });

  it('returns empty when no places match radius', () => {
    const sampled = samplePlaces(places, 1, []);
    expect(sampled).toHaveLength(0);
  });

  it('returns empty when no places match activity filter', () => {
    const sampled = samplePlaces(places, 1000, ['nonexistent']);
    expect(sampled).toHaveLength(0);
  });

  it('returns empty when no places match both radius and activity', () => {
    const sampled = samplePlaces(places, 15, ['historic']);
    expect(sampled).toHaveLength(0);
  });

  it('applies radius filter before activity filter', () => {
    // Only Museum A (5 km) and Museum B (10 km) are within 15 km
    const sampled = samplePlaces(places, 15, ['museum']);
    expect(sampled.length).toBeLessThanOrEqual(2);
    for (const p of sampled) {
      expect(p.tags).toContain('museum');
      expect(p.distanceKm).toBeLessThanOrEqual(15);
    }
  });

  it('randomizes sample (statistically)', () => {
    const largePlaces = Array.from({ length: 100 }, (_, i) => ({
      id: `node/${i}`,
      name: `Place ${i}`,
      lat: 51.5,
      lng: -0.1,
      distanceKm: i % 50,
      tags: [],
      osmTags: {},
    }));

    const samples = [
      samplePlaces(largePlaces, 50, []),
      samplePlaces(largePlaces, 50, []),
      samplePlaces(largePlaces, 50, []),
    ];

    // At least one sample should be different (with high probability)
    const hasVariation = !samples.every((s) => JSON.stringify(s) === JSON.stringify(samples[0]));
    expect(hasVariation).toBe(true);
  });
});

describe('Overpass Caching – Cache Scenarios', () => {
  describe('Radius shrinking (cached data reuse)', () => {
    it('can re-sample from cache when radius shrinks', () => {
      const cached: City[] = [
        { id: 'node/1', name: 'A', lat: 51.5, lng: -0.1, distanceKm: 5, tags: [], osmTags: {} },
        { id: 'node/2', name: 'B', lat: 51.5, lng: -0.1, distanceKm: 50, tags: [], osmTags: {} },
        { id: 'node/3', name: 'C', lat: 51.5, lng: -0.1, distanceKm: 100, tags: [], osmTags: {} },
      ];
      // Original query was for 100 km
      const largeRadius = samplePlaces(cached, 100, []);
      expect(largeRadius.length).toBeLessThanOrEqual(3);

      // Shrink radius to 30 km
      const smallRadius = samplePlaces(cached, 30, []);
      // Should only include A and B
      for (const p of smallRadius) {
        expect(p.distanceKm).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('Activity-only filter change (cached data reuse)', () => {
    it('can re-filter from cache when only activities change', () => {
      const cached: City[] = [
        { id: 'node/1', name: 'Museum', lat: 51.5, lng: -0.1, distanceKm: 5, tags: ['museum'], osmTags: {} },
        { id: 'node/2', name: 'Beach', lat: 51.5, lng: -0.1, distanceKm: 10, tags: ['beach'], osmTags: {} },
        { id: 'node/3', name: 'Peak', lat: 51.5, lng: -0.1, distanceKm: 15, tags: ['mountain'], osmTags: {} },
      ];
      // Query with no activity filter
      const allActivities = samplePlaces(cached, 50, []);
      expect(allActivities.length).toBeLessThanOrEqual(3);

      // Query with museum filter only
      const museumsOnly = samplePlaces(cached, 50, ['museum']);
      for (const p of museumsOnly) {
        expect(p.tags).toContain('museum');
      }
    });
  });

  describe('Deduplication across multiple Overpass calls', () => {
    it('prevents duplicate IDs when appending new results', () => {
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();

      // First call: fetch inner disk
      const elements1: OverpassElement[] = [
        { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Place A', tourism: 'museum' } },
        { type: 'node', id: 2, lat: 51.5, lon: -0.1, tags: { name: 'Place B', tourism: 'museum' } },
      ];
      const places1 = parseElements(elements1, 51.5, -0.1, seenIds, seenNames);
      expect(places1).toHaveLength(2);
      expect(seenIds.size).toBe(2);
      expect(seenNames.size).toBe(2);

      // Second call: fetch annulus (outer minus inner)
      // Might contain some duplicates that appeared in both calls
      const elements2: OverpassElement[] = [
        { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { name: 'Place A', tourism: 'museum' } }, // duplicate ID
        { type: 'node', id: 3, lat: 51.5, lon: -0.1, tags: { name: 'Place A', tourism: 'museum' } }, // duplicate name
        { type: 'node', id: 4, lat: 51.5, lon: -0.1, tags: { name: 'Place D', tourism: 'museum' } }, // new
      ];
      const places2 = parseElements(elements2, 51.5, -0.1, seenIds, seenNames);
      // Should only include node/4 (D is new)
      expect(places2).toHaveLength(1);
      expect(places2[0].name).toBe('Place D');
      // Total seenIds should now be 3, seenNames should be 3
      expect(seenIds.size).toBe(3);
      expect(seenNames.size).toBe(3);
    });
  });
});
