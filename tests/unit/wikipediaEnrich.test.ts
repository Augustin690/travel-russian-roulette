import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichFromWikipedia } from '../../src/lib/wikipediaEnrich';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function queryResponse(overrides: Record<string, any> = {}) {
  return {
    query: {
      pages: {
        '123': {
          ns: 0,
          title: 'Test Page',
          thumbnail: { source: 'https://example.com/img.jpg', width: 1200, height: 800 },
          extract: 'A great place to visit.',
          ...overrides,
        },
      },
    },
  };
}

function missingResponse(title = 'Missing Page') {
  return {
    query: {
      pages: {
        '-1': { ns: 0, title, missing: '' },
      },
    },
  };
}

function emptyPageResponse() {
  // Page exists (no `missing`) but has neither thumbnail nor extract.
  return {
    query: {
      pages: {
        '456': { ns: 0, title: 'Stub Page' },
      },
    },
  };
}

function opensearchResponse(titles: string[]) {
  return ['', titles, [], []];
}

function mockFetch(...responses: any[]) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const body = responses[call] ?? responses[responses.length - 1];
    call++;
    return Promise.resolve({ json: () => Promise.resolve(body) });
  });
}

const signal = new AbortController().signal;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('enrichFromWikipedia', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Step 1: direct name hit ---

  it('returns image and description when exact name matches', async () => {
    vi.stubGlobal('fetch', mockFetch(queryResponse()));

    const result = await enrichFromWikipedia('Test Page', {}, signal);

    expect(result.image).toBe('https://example.com/img.jpg');
    expect(result.description).toBe('A great place to visit.');
  });

  it('stops at step 1 and does not call further APIs when name matches', async () => {
    const fetch = mockFetch(queryResponse());
    vi.stubGlobal('fetch', fetch);

    await enrichFromWikipedia('Test Page', {}, signal);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // --- Step 2: name:en fallback ---

  it('falls back to name:en when primary name is missing', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(missingResponse(), queryResponse({ title: 'English Name' })),
    );

    const result = await enrichFromWikipedia('陈毅雕像', { 'name:en': 'Statue of Chen Yi' }, signal);

    expect(result.image).toBe('https://example.com/img.jpg');
    expect(result.description).toBe('A great place to visit.');
  });

  it('skips name:en step when name:en equals primary name', async () => {
    const fetch = mockFetch(
      missingResponse(),
      // word stripping: "Nanxiang" found
      queryResponse({ title: 'Nanxiang' }),
    );
    vi.stubGlobal('fetch', fetch);

    await enrichFromWikipedia('Nanxiang', { 'name:en': 'Nanxiang' }, signal);

    // Only 1 call: primary name (missing), then word strip skipped because
    // single word has nothing to strip. Falls to opensearch.
    // Actually single-word name → tryWordStripping tries n=0 which is < 1, returns null immediately.
    // Then opensearch fires. So 2 total calls.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  // --- Step 3: word stripping ---

  it('strips last word and finds article for compound name', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        missingResponse('Nanxiang Old Town'), // primary name
        missingResponse('Nanxiang Old'),      // strip to 2 words
        queryResponse({ title: 'Nanxiang' }), // strip to 1 word — hit
      ),
    );

    const result = await enrichFromWikipedia('Nanxiang Old Town', {}, signal);

    expect(result.description).toBe('A great place to visit.');
  });

  it('tries each word-stripped variant in order before giving up', async () => {
    const fetch = mockFetch(
      missingResponse('A B C D'), // primary
      missingResponse('A B C'),   // strip 1
      missingResponse('A B'),     // strip 2
      missingResponse('A'),       // strip 3
      opensearchResponse([]),     // opensearch — no result
    );
    vi.stubGlobal('fetch', fetch);

    const result = await enrichFromWikipedia('A B C D', {}, signal);

    expect(result).toEqual({});
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('does not attempt word stripping for a single-word name', async () => {
    const fetch = mockFetch(
      missingResponse('Paris'),     // primary
      opensearchResponse(['Paris']), // opensearch
      queryResponse({ title: 'Paris' }),
    );
    vi.stubGlobal('fetch', fetch);

    await enrichFromWikipedia('Paris', {}, signal);

    // No word-strip calls between missing and opensearch.
    const urls: string[] = fetch.mock.calls.map((c: any[]) => c[0] as string);
    expect(urls.some((u) => u.includes('action=query') && u.includes('Paris') && !u.includes('opensearch'))).toBe(true);
    expect(urls.filter((u) => u.includes('action=query'))).toHaveLength(2); // primary + opensearch result
  });

  // --- Step 4: opensearch ---

  it('uses opensearch when all direct lookups fail', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        missingResponse('Monument aux Morts'),       // primary
        emptyPageResponse(),                          // word strip: "Monument aux"
        missingResponse('Monument'),                  // word strip: "Monument"
        opensearchResponse(['War memorial']),          // opensearch
        queryResponse({ title: 'War memorial' }),     // opensearch result fetch
      ),
    );

    const result = await enrichFromWikipedia('Monument aux Morts', {}, signal);

    expect(result.image).toBe('https://example.com/img.jpg');
  });

  it('returns empty object when opensearch finds no title', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        missingResponse(),
        opensearchResponse([]),
      ),
    );

    const result = await enrichFromWikipedia('XyzUnknownPlace', {}, signal);

    expect(result).toEqual({});
  });

  it('returns empty object when opensearch title also has no content', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        missingResponse(),          // primary
        opensearchResponse(['Stub']), // opensearch
        emptyPageResponse(),         // opensearch result — no content
      ),
    );

    const result = await enrichFromWikipedia('XyzPlace', {}, signal);

    expect(result).toEqual({});
  });

  // --- Content-presence edge cases ---

  it('returns result when page has image but no description', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(queryResponse({ extract: undefined })),
    );

    const result = await enrichFromWikipedia('Photo Only', {}, signal);

    expect(result.image).toBe('https://example.com/img.jpg');
    expect(result.description).toBeUndefined();
  });

  it('returns result when page has description but no image', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(queryResponse({ thumbnail: undefined })),
    );

    const result = await enrichFromWikipedia('Text Only', {}, signal);

    expect(result.description).toBe('A great place to visit.');
    expect(result.image).toBeUndefined();
  });

  it('does not treat content-free page as a hit — falls through to next step', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        emptyPageResponse(),              // primary — exists but no content
        queryResponse({ title: 'Real' }), // word strip hit
      ),
    );

    const result = await enrichFromWikipedia('Real Article', {}, signal);

    expect(result.description).toBe('A great place to visit.');
  });

  // --- name:en + word stripping interaction ---

  it('uses name:en as the base term for word stripping', async () => {
    const fetch = mockFetch(
      missingResponse('南翔老街'),           // primary Chinese name
      missingResponse('Nanxiang Old Town'), // name:en exact
      queryResponse({ title: 'Nanxiang' }), // name:en stripped to 1 word
    );
    vi.stubGlobal('fetch', fetch);

    const result = await enrichFromWikipedia(
      '南翔老街',
      { 'name:en': 'Nanxiang Old Town' },
      signal,
    );

    expect(result.description).toBe('A great place to visit.');
    // Verify stripping used the English term not the Chinese one.
    const urls: string[] = fetch.mock.calls.map((c: any[]) => c[0] as string);
    expect(urls[2]).toContain(encodeURIComponent('Nanxiang'));
  });

  // --- Abort signal ---

  it('passes the abort signal to every fetch call', async () => {
    const ctrl = new AbortController();
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        signals.push(opts.signal as AbortSignal);
        return Promise.resolve({ json: () => Promise.resolve(missingResponse()) });
      }),
    );

    await enrichFromWikipedia('Test Place', {}, ctrl.signal).catch(() => {});

    expect(signals.length).toBeGreaterThan(0);
    signals.forEach((s) => expect(s).toBe(ctrl.signal));
  });

  it('rejects with AbortError when the signal is aborted', async () => {
    const ctrl = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );
    ctrl.abort();

    await expect(enrichFromWikipedia('Test', {}, ctrl.signal)).rejects.toThrow('Aborted');
  });
});
