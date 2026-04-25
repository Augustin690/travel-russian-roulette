# Security Audit — roulette-trip

**Date:** 2026-04-25  
**Method:** js-supply-chain-security skill + manual code review  
**Scope:** supply chain, CI/CD, frontend runtime, secrets hygiene

---

## Summary

| Severity | Count |
|----------|-------|
| High     | 1     |
| Medium   | 3     |
| Low/Info | 3     |
| Pass     | 7     |

---

## HIGH

### H1 · GitHub Actions pinned to tags, not commit SHAs

**File:** `.github/workflows/deploy.yml:23–56`

All five Actions are pinned to mutable tags (`@v4`, `@v3`, `@v5`). A tag can be silently force-pushed to a different commit, making CI pull malicious code without any diff visible in the workflow file.

```yaml
# Current (bad)
uses: actions/checkout@v4

# Fix — pin to the exact SHA that v4 currently resolves to
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

Do the same for all five actions. Use a tool like `pin-github-action` or look up the current SHA on the releases page for each action.

> **Why it matters:** The `actions/*` namespace is owned by GitHub and lower risk than third-party actions, but this is still the pattern that supply-chain attacks exploit. Tagging your own policy is free insurance.

---

## MEDIUM

### M1 · `.env` not in `.gitignore`

**File:** `.gitignore`

`.gitignore` only covers `*.local`. A future `.env` file would be silently committed. The `.env.example` file is already tracked (no secrets in it now, but sets a precedent).

```diff
 node_modules
 dist
 .DS_Store
 *.local
+.env
+.env.*
+!.env.example
 .vite
```

The `!.env.example` exception keeps the documented template in git while blocking real credential files.

---

### M2 · Google Fonts stylesheet loaded without SRI hash

**File:** `index.html:10`

```html
<!-- Current -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

If the Google Fonts CDN is compromised or the URL is tampered with, the browser would load and apply arbitrary CSS — which can exfiltrate content via attribute selectors or background-image requests. SRI prevents this.

```html
<!-- Fix — generate the hash, then pin it -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
      integrity="sha384-<hash>"
      crossorigin="anonymous" />
```

Generate the hash with: `curl -s "<url>" | openssl dgst -sha384 -binary | openssl base64 -A`

Alternatively, self-host the font subset (easiest with `vite-plugin-webfont-dl`).

> Note: the `<link rel="preconnect">` tags on lines 7–8 don't execute scripts and don't need SRI.

---

### M3 · No Content Security Policy

**Files:** `index.html`, `vite.config.ts` (no headers defined)

The app has no CSP. It makes legitimate external network calls to four origins (Wikipedia, Nominatim, Overpass, OSM). Without a CSP, any injected script or XSS gadget can connect anywhere.

Add a `<meta>` CSP that allowlists only the known origins:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' https://upload.wikimedia.org data:;
  connect-src 'self'
    https://en.wikipedia.org
    https://nominatim.openstreetmap.org
    https://overpass-api.de;
  frame-src https://www.openstreetmap.org;
">
```

For a GitHub Pages deployment this is the only available mechanism (no server headers). Alternatively add a `_headers` file if you migrate to Netlify/Vercel.

---

## LOW / INFO

### L1 · `esbuild` postinstall script (expected, but worth noting)

**File:** `node_modules/esbuild/package.json`

`esbuild` runs `node install.js` on install. Inspection confirms it only downloads the platform-specific native binary from the npm registry (same pattern used by `vite`, `rollup`, etc.). This is not malicious, but it is a code-execution surface. If the `esbuild` package were compromised (Shai-Hulud style), this script would run on every `npm install`.

**Mitigation:** `npm ci --ignore-scripts` in CI would block it, but esbuild would then fail to find its binary. Current practice (running full `npm ci` in CI) is the standard tradeoff.

---

### L2 · 10 packages outdated, including major version jumps

```
react / react-dom      18 → 19      (major)
vite                    5 → 8       (major)
@vitejs/plugin-react    4 → 6       (major)
tailwindcss             3 → 4       (major)
typescript              5 → 6       (major)
framer-motion          11 → 12      (major)
```

Major version bumps carry breaking-change risk, not supply-chain risk. However, staying on old versions means missing security patches in those packages. Recommend scheduling an upgrade sprint — especially for `vite` (many security advisories between v5 and v8).

---

### L3 · `parseFloat` coordinates not validated before Overpass query injection

**File:** `src/hooks/useGeocoding.ts:47–48`, `src/hooks/usePlaces.ts:48`

```ts
lat: parseFloat(r.lat),  // could be NaN if Nominatim returns unexpected data
lng: parseFloat(r.lon),
```

These `NaN` values flow directly into the Overpass QL query string:

```ts
const area = `(around:${radiusM},${lat},${lng})`;
```

`NaN` in a query string produces invalid QL and silently fails (empty result). This is a correctness/DoS-class bug rather than a security issue — the Overpass endpoint would reject or ignore the malformed query and return nothing. No code execution is possible.

**Fix (optional):** add a guard in `usePlaces.ts`:

```ts
if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return;
```

---

## Passing Checks

| Check | Result |
|-------|--------|
| Lockfile (`package-lock.json`) committed | ✓ |
| CI uses `npm ci`, not `npm install` | ✓ |
| No hardcoded secrets in source files | ✓ |
| `.env.example` contains only comments — no real credentials | ✓ |
| No `dangerouslySetInnerHTML` in any component | ✓ |
| User-supplied text in external URLs wrapped with `encodeURIComponent` | ✓ |
| `npm audit` — zero high/critical CVEs | ✓ |

---

## Recommended Fix Order

1. **Pin Actions to SHAs** (H1) — 10-minute change, immutable CI
2. **Add `.env` to `.gitignore`** (M1) — one-line change, prevents future credential leaks
3. **Add CSP meta tag** (M3) — medium effort, locks down allowed origins
4. **Add SRI to Google Fonts link** (M2) — low effort, pins the stylesheet
5. **Schedule major-version upgrades** (L2) — sprint-sized, especially `vite`
