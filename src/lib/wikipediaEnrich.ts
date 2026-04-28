const WP_API = 'https://en.wikipedia.org/w/api.php';

export interface WikiResult {
  image?: string;
  description?: string;
}

function queryUrl(title: string): string {
  return (
    `${WP_API}?action=query` +
    `&titles=${encodeURIComponent(title)}` +
    `&prop=pageimages|extracts` +
    `&format=json&pithumbsize=1200&exintro=1&explaintext=1&exchars=350&origin=*`
  );
}

function opensearchUrl(term: string): string {
  return (
    `${WP_API}?action=opensearch` +
    `&search=${encodeURIComponent(term)}&limit=1&format=json&origin=*`
  );
}

// Fetches a Wikipedia article by exact title. Returns its image/description
// if the page exists and has usable content, otherwise returns null.
async function fetchByTitle(
  title: string,
  signal: AbortSignal,
): Promise<WikiResult | null> {
  const data = await fetch(queryUrl(title), { signal }).then((r) => r.json());
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0] as Record<string, any>;
  if (!page || page.missing !== undefined) return null;
  const image: string | undefined = page.thumbnail?.source;
  const description: string | undefined = page.extract;
  if (!image && !description) return null;
  return { image, description };
}

// Progressively drops the last word and tries each shorter title.
// Starts at length-1 so the full title (already tried) is skipped.
async function tryWordStripping(
  term: string,
  signal: AbortSignal,
): Promise<WikiResult | null> {
  const words = term.trim().split(/\s+/);
  for (let n = words.length - 1; n >= 1; n--) {
    const result = await fetchByTitle(words.slice(0, n).join(' '), signal);
    if (result) return result;
  }
  return null;
}

// Runs opensearch and, if a title is found, fetches that article.
async function tryOpensearch(
  term: string,
  signal: AbortSignal,
): Promise<WikiResult | null> {
  const res = await fetch(opensearchUrl(term), { signal }).then((r) =>
    r.json(),
  );
  const firstTitle: string | undefined = res[1]?.[0];
  if (!firstTitle) return null;
  return fetchByTitle(firstTitle, signal);
}

/**
 * Enriches a POI with a Wikipedia image and description.
 *
 * Lookup chain (stops at first hit):
 *  1. Exact match on `name`
 *  2. Exact match on `nameEn` (OSM name:en tag), if different
 *  3. Progressive word stripping on `nameEn ?? name`
 *  4. Opensearch on `nameEn ?? name`
 */
export async function enrichFromWikipedia(
  name: string,
  osmTags: Record<string, string>,
  signal: AbortSignal,
): Promise<WikiResult> {
  const nameEn: string | undefined = osmTags['name:en'];
  const searchTerm = nameEn ?? name;

  return (
    (await fetchByTitle(name, signal)) ??
    (nameEn && nameEn !== name ? await fetchByTitle(nameEn, signal) : null) ??
    (await tryWordStripping(searchTerm, signal)) ??
    (await tryOpensearch(searchTerm, signal)) ??
    {}
  );
}
