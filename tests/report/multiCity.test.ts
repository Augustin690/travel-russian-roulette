// @vitest-environment node
//
// Full multi-city relevance report: 19 cities across all regions.
// Produces a scored breakdown of how well the app works globally.
//
// Run with: npm run test:report
// Expected runtime: 5–15 minutes (depends on Overpass API response time).
import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { fetchPlaces, sleep } from '../helpers/api';
import {
  scoreRelevance,
  printReport,
  printSummary,
  type RelevanceReport,
} from '../helpers/scoreRelevance';
import { TEST_CITIES } from '../fixtures/testCities';

const RADIUS_KM = 50;
const PASS_SCORE = 30; // minimum acceptable score per city
const TARGET_PASS_RATE = 0.70; // at least 70 % of cities must pass

const reports: RelevanceReport[] = [];

afterEach(() => sleep(3000)); // be polite to the public Overpass instance

afterAll(() => {
  printSummary(reports);
});

describe('Multi-city relevance report', () => {
  for (const city of TEST_CITIES) {
    it(`${city.name} (${city.region})`, async () => {
      const places = await fetchPlaces(city.lat, city.lng, RADIUS_KM);
      const report = scoreRelevance(
        city.name,
        city.region,
        places,
        city.expectedTags,
        city.notes,
      );
      reports.push(report);
      printReport(report);

      // Soft assertion: log failures but collect all results.
      // A city "passes" if it scores ≥ PASS_SCORE.
      expect(
        report.coverageScore,
        `${city.name}: score ${report.coverageScore} below threshold ${PASS_SCORE}`,
      ).toBeGreaterThanOrEqual(PASS_SCORE);
    }, 120_000);
  }

  it('at least 70 % of cities meet the pass threshold', () => {
    // Runs after all city tests have been collected in afterAll.
    // We evaluate synchronously because reports[] is populated by the time
    // this test's body runs (tests run sequentially in this file).
    const passing = reports.filter((r) => r.coverageScore >= PASS_SCORE);
    const rate = passing.length / reports.length;
    console.log(
      `\nPass rate: ${passing.length}/${reports.length} (${Math.round(rate * 100)} %)`,
    );
    expect(rate).toBeGreaterThanOrEqual(TARGET_PASS_RATE);
  });
});
