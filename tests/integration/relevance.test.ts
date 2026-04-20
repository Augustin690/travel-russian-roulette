// @vitest-environment node
//
// Smoke relevance test: 5 geographically diverse cities, one per major region.
// Each city must return enough places and at least one of its expected tag types.
// Run with: npm run test:integration
import { describe, it, expect, afterEach } from 'vitest';
import { fetchPlaces, sleep } from '../helpers/api';
import { scoreRelevance, printReport } from '../helpers/scoreRelevance';
import { SMOKE_CITIES } from '../fixtures/testCities';

const RADIUS_KM = 50;
const MIN_PLACES = 5;
const MIN_SCORE = 30; // lenient: remote/sparse cities may score lower

afterEach(() => sleep(2500));

describe('Relevance smoke test – 5 global cities', () => {
  for (const city of SMOKE_CITIES) {
    it(`${city.shortName} (${city.region}) – returns relevant places`, async () => {
      const places = await fetchPlaces(city.lat, city.lng, RADIUS_KM);
      const report = scoreRelevance(
        city.shortName,
        city.region,
        places,
        city.expectedTags,
        city.notes,
      );
      printReport(report);

      expect(
        places.length,
        `${city.shortName}: expected ≥${MIN_PLACES} places, got ${places.length}`,
      ).toBeGreaterThanOrEqual(MIN_PLACES);

      expect(
        report.presentExpectedTags.length,
        `${city.shortName}: none of its expected tags (${city.expectedTags.join(', ')}) appeared in results`,
      ).toBeGreaterThan(0);

      expect(
        report.coverageScore,
        `${city.shortName}: score ${report.coverageScore} below minimum ${MIN_SCORE}`,
      ).toBeGreaterThanOrEqual(MIN_SCORE);
    }, 90_000);
  }
});
