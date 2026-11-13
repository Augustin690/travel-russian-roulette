import { describe, it, expect } from 'vitest';
import { buildShareQuery, parseShareQuery, type SharedSpin } from '../../src/lib/shareUrl';
import { haversineKm } from '../../src/lib/geoUtils';
import type { City } from '../../src/data/cities';

const origin = { lat: 48.8566, lng: 2.3522, displayName: 'Paris' };

const place: City = {
  id: 'node/5013364',
  name: 'Eiffel Tower',
  lat: 48.8584,
  lng: 2.2945,
  distanceKm: 0,
  tags: ['historic', 'viewpoint'],
  osmTags: { tourism: 'attraction', wikidata: 'Q243' },
};

const state: SharedSpin = {
  origin,
  filters: { radiusKm: 100, activities: ['historic', 'museum'] },
  place,
};

describe('buildShareQuery', () => {
  it('produces a query string starting with ?', () => {
    expect(buildShareQuery(state).startsWith('?')).toBe(true);
  });

  it('encodes city, radius, filters and place identity', () => {
    const params = new URLSearchParams(buildShareQuery(state).slice(1));
    expect(params.get('c')).toBe('Paris');
    expect(params.get('r')).toBe('100');
    expect(params.get('f')).toBe('hi,mu');
    expect(params.get('pt')).toBe('node');
    expect(params.get('pid')).toBe('5013364');
    expect(params.get('n')).toBe('Eiffel Tower');
    expect(params.get('cat')).toBe('historic');
  });

  it('rounds coordinates to 5 decimals', () => {
    const q = buildShareQuery(state);
    expect(q).toContain('ola=48.8566');
    expect(q).toContain('oln=2.3522');
    expect(q).toContain('pla=48.8584');
    expect(q).toContain('pln=2.2945');
    expect(q).not.toMatch(/ola=\d+\.\d{6}/);
  });

  it('omits the filters parameter when no activity is active', () => {
    const q = buildShareQuery({ ...state, filters: { radiusKm: 40, activities: [] } });
    const params = new URLSearchParams(q.slice(1));
    expect(params.has('f')).toBe(false);
    expect(params.get('r')).toBe('40');
  });

  it('encodes all supported activity filters with short keys', () => {
    const all = buildShareQuery({
      ...state,
      filters: {
        radiusKm: 300,
        activities: ['historic', 'nature', 'museum', 'beach', 'mountain', 'cultural', 'viewpoint'],
      },
    });
    const params = new URLSearchParams(all.slice(1));
    expect(params.get('f')).toBe('hi,na,mu,be,mo,cu,vi');
  });

  it('encodes place names with spaces and accents', () => {
    const q = buildShareQuery({
      ...state,
      place: { ...place, name: 'Musée d’Orsay' },
    });
    expect(parseShareQuery(q)?.place.name).toBe('Musée d’Orsay');
  });
});

describe('parseShareQuery round-trip', () => {
  it('restores origin, filters and place identity', () => {
    const parsed = parseShareQuery(buildShareQuery(state));
    expect(parsed).not.toBeNull();
    expect(parsed!.origin).toEqual({ lat: 48.8566, lng: 2.3522, displayName: 'Paris' });
    expect(parsed!.filters).toEqual({ radiusKm: 100, activities: ['historic', 'museum'] });
    expect(parsed!.place.id).toBe('node/5013364');
    expect(parsed!.place.name).toBe('Eiffel Tower');
    expect(parsed!.place.lat).toBeCloseTo(48.8584, 5);
    expect(parsed!.place.lng).toBeCloseTo(2.2945, 5);
    expect(parsed!.place.tags).toEqual(['historic']);
  });

  it('derives the distance from origin to the stored place', () => {
    const parsed = parseShareQuery(buildShareQuery(state))!;
    const expected = Math.round(haversineKm(origin.lat, origin.lng, place.lat, place.lng));
    expect(parsed.place.distanceKm).toBe(expected);
    expect(Number.isInteger(parsed.place.distanceKm)).toBe(true);
  });

  it('accepts a search string without the leading question mark', () => {
    const q = buildShareQuery(state);
    expect(parseShareQuery(q.slice(1))).toEqual(parseShareQuery(q));
  });

  it('restores way and relation places', () => {
    for (const id of ['way/12345', 'relation/98765']) {
      const parsed = parseShareQuery(buildShareQuery({ ...state, place: { ...place, id } }));
      expect(parsed?.place.id).toBe(id);
    }
  });

  it('ignores unknown extra parameters', () => {
    const q = `${buildShareQuery(state)}&utm_source=foo&x=1`;
    expect(parseShareQuery(q)).not.toBeNull();
  });

  it('returns an empty activity list when the filters parameter is absent', () => {
    const q = buildShareQuery({ ...state, filters: { radiusKm: 20, activities: [] } });
    expect(parseShareQuery(q)?.filters.activities).toEqual([]);
  });
});

describe('parseShareQuery invalid input', () => {
  it('returns null for an empty search string', () => {
    expect(parseShareQuery('')).toBeNull();
    expect(parseShareQuery('?')).toBeNull();
  });

  it('returns null when required parameters are missing (partial data)', () => {
    const required = ['c', 'ola', 'oln', 'r', 'pt', 'pid', 'n', 'pla', 'pln', 'cat'];
    const params = new URLSearchParams(buildShareQuery(state).slice(1));
    for (const key of required) {
      const partial = new URLSearchParams(params);
      partial.delete(key);
      expect(parseShareQuery(`?${partial.toString()}`), `missing ${key}`).toBeNull();
    }
  });

  it('returns null for malformed or out-of-range numbers', () => {
    const mutations: Array<Record<string, string>> = [
      { r: 'abc' },
      { r: '' },
      { r: '10' },
      { r: '301' },
      { r: 'NaN' },
      { ola: '91' },
      { ola: '-91' },
      { oln: '181' },
      { oln: '2.35.22' },
      { pla: '48,8584' },
      { pln: 'x' },
    ];
    for (const mutation of mutations) {
      const params = new URLSearchParams(buildShareQuery(state).slice(1));
      for (const [k, v] of Object.entries(mutation)) params.set(k, v);
      expect(parseShareQuery(`?${params.toString()}`), JSON.stringify(mutation)).toBeNull();
    }
  });

  it('returns null for unknown OSM type, malformed id or unknown category', () => {
    const mutations: Array<Record<string, string>> = [
      { pt: 'area' },
      { pid: '12abc' },
      { pid: '-3' },
      { pid: '0' },
      { cat: 'shopping' },
    ];
    for (const mutation of mutations) {
      const params = new URLSearchParams(buildShareQuery(state).slice(1));
      for (const [k, v] of Object.entries(mutation)) params.set(k, v);
      expect(parseShareQuery(`?${params.toString()}`), JSON.stringify(mutation)).toBeNull();
    }
  });

  it('returns null for blank city or place name', () => {
    const q = buildShareQuery(state);
    expect(parseShareQuery(q.replace('c=Paris', 'c=%20%20'))).toBeNull();
    expect(parseShareQuery(q.replace('n=Eiffel+Tower', 'n='))).toBeNull();
  });

  it('drops unknown filter keys but keeps valid ones', () => {
    const q = `${buildShareQuery(state)}&f=hi,zz`;
    const params = new URLSearchParams(q.slice(1));
    params.set('f', 'zz,hi');
    expect(parseShareQuery(`?${params.toString()}`)?.filters.activities).toEqual(['historic']);
  });

  it('never throws on garbage input', () => {
    for (const junk of ['?%%%%', '?a=%ZZ', '?=&=', '?r=1e999', '?f=%E0%A4%A']) {
      expect(() => parseShareQuery(junk), junk).not.toThrow();
      expect(parseShareQuery(junk), junk).toBeNull();
    }
  });
});
