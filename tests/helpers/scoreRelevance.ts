import type { City, ActivityTag } from '../../src/data/cities';

const ALL_TAGS: ActivityTag[] = [
  'historic',
  'nature',
  'museum',
  'beach',
  'mountain',
  'cultural',
  'viewpoint',
];

export interface RelevanceReport {
  city: string;
  region: string;
  totalPlaces: number;
  tagDistribution: Record<ActivityTag, number>;
  presentExpectedTags: ActivityTag[];
  expectedTagCoverage: number; // 0–1
  coverageScore: number;       // 0–100
  notes?: string;
}

export function scoreRelevance(
  cityName: string,
  region: string,
  places: City[],
  expectedTags: ActivityTag[],
  notes?: string,
): RelevanceReport {
  const tagDistribution = Object.fromEntries(
    ALL_TAGS.map((tag) => [tag, places.filter((p) => p.tags.includes(tag)).length]),
  ) as Record<ActivityTag, number>;

  const presentExpectedTags = expectedTags.filter((t) => tagDistribution[t] > 0);
  const expectedTagCoverage =
    expectedTags.length > 0 ? presentExpectedTags.length / expectedTags.length : 1;

  // Score: 50 pts for result volume (capped at 20 places), 50 pts for tag coverage
  const countScore = Math.min(places.length / 20, 1) * 50;
  const tagScore = expectedTagCoverage * 50;
  const coverageScore = Math.round(countScore + tagScore);

  return {
    city: cityName,
    region,
    totalPlaces: places.length,
    tagDistribution,
    presentExpectedTags,
    expectedTagCoverage,
    coverageScore,
    notes,
  };
}

export function printReport(report: RelevanceReport): void {
  const filledStars = Math.round(report.coverageScore / 20);
  const stars = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);
  console.log(
    `\n${report.city} (${report.region}) ${stars} [${report.coverageScore}/100]`,
  );
  if (report.notes) console.log(`  Note: ${report.notes}`);
  console.log(`  Places found   : ${report.totalPlaces}`);
  console.log(
    `  Expected tags  : ${report.presentExpectedTags.length}/${Math.max(1, report.presentExpectedTags.length + (report.expectedTagCoverage < 1 ? 1 : 0))} present`,
  );
  console.log('  Tag distribution:');
  for (const tag of ALL_TAGS) {
    const count = report.tagDistribution[tag];
    if (count > 0) {
      const bar = '▓'.repeat(Math.min(count, 25));
      console.log(`    ${tag.padEnd(10)} ${bar} (${count})`);
    }
  }
}

export function printSummary(reports: RelevanceReport[]): void {
  const passing = reports.filter((r) => r.coverageScore >= 50);
  const avg = Math.round(reports.reduce((s, r) => s + r.coverageScore, 0) / reports.length);
  const best = reports.reduce((a, b) => (a.coverageScore > b.coverageScore ? a : b));
  const worst = reports.reduce((a, b) => (a.coverageScore < b.coverageScore ? a : b));

  console.log('\n' + '═'.repeat(60));
  console.log('MULTI-CITY RELEVANCE SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Cities tested    : ${reports.length}`);
  console.log(`Passing (≥50)    : ${passing.length}/${reports.length}`);
  console.log(`Average score    : ${avg}/100`);
  console.log(`Best             : ${best.city} (${best.coverageScore})`);
  console.log(`Worst            : ${worst.city} (${worst.coverageScore})`);
  console.log('');
  console.log('Scores by city:');
  for (const r of [...reports].sort((a, b) => b.coverageScore - a.coverageScore)) {
    const bar = '█'.repeat(Math.round(r.coverageScore / 5));
    console.log(`  ${r.city.padEnd(22)} ${bar.padEnd(20)} ${r.coverageScore}`);
  }
}
