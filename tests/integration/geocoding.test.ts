// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { geocodeCity, sleep } from '../helpers/api';

// Nominatim requires a courteous request rate – pause between tests.
afterEach(() => sleep(1000));

describe('Geocoding – Nominatim API', () => {
  const knownCities = [
    { query: 'London',       approxLat: 51.5,  approxLng:  -0.1, tolerance: 0.5 },
    { query: 'Tokyo',        approxLat: 35.7,  approxLng: 139.7, tolerance: 0.5 },
    { query: 'Cairo',        approxLat: 30.0,  approxLng:  31.2, tolerance: 0.5 },
    { query: 'Sydney',       approxLat: -33.9, approxLng: 151.2, tolerance: 0.5 },
    { query: 'Buenos Aires', approxLat: -34.6, approxLng: -58.4, tolerance: 0.5 },
    { query: 'Cape Town',    approxLat: -33.9, approxLng:  18.4, tolerance: 0.5 },
    { query: 'Mexico City',  approxLat: 19.4,  approxLng: -99.1, tolerance: 0.5 },
  ];

  for (const { query, approxLat, approxLng, tolerance } of knownCities) {
    it(`geocodes "${query}" to the correct region`, async () => {
      const result = await geocodeCity(query);
      expect(result, `No result for "${query}"`).not.toBeNull();
      expect(Math.abs(result!.lat - approxLat), 'lat out of range').toBeLessThan(tolerance);
      expect(Math.abs(result!.lng - approxLng), 'lng out of range').toBeLessThan(tolerance);
      expect(result!.displayName).toBeTruthy();
    }, 20_000);
  }

  it('handles non-Latin script city names (Tokyo in Japanese)', async () => {
    const result = await geocodeCity('東京');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(35);
    expect(result!.lat).toBeLessThan(36);
  }, 20_000);

  it('handles unusual city names (Ulaanbaatar)', async () => {
    const result = await geocodeCity('Ulaanbaatar');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(45);
    expect(result!.lat).toBeLessThan(50);
  }, 20_000);

  it('returns null for nonsense input', async () => {
    const result = await geocodeCity('xyznotacitynameatall99999');
    expect(result).toBeNull();
  }, 20_000);

  it('result has valid lat/lng ranges', async () => {
    const result = await geocodeCity('Paris');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(-90);
    expect(result!.lat).toBeLessThan(90);
    expect(result!.lng).toBeGreaterThan(-180);
    expect(result!.lng).toBeLessThan(180);
  }, 20_000);
});
