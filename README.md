# Roulette Trip

A day-trip roulette — enter any city, set a radius, hit spin. One randomly chosen nearby attraction is revealed with a slot-machine animation, a Wikipedia photo, and a description.

**[Try it live →](https://augustin690.github.io/travel-russian-roulette/)**

## How it works

1. Type your city (Paris, Tokyo, São Paulo, anywhere)
2. Set a search radius and optionally filter by activity type
3. Hit **SPIN** — the app fetches nearby points of interest and picks one at random
4. The result card shows the place, its tags, an auto-loaded Wikipedia photo and description, an OpenStreetMap embed, and a directions link

No account or API key required.

## Stack

- **React 18 + Vite** (TypeScript)
- **Tailwind CSS** + Framer Motion + canvas-confetti
- **Nominatim** (OSM geocoding) — city search autocomplete
- **Overpass API** — live POI data (historic sites, nature, museums, beaches, mountains, viewpoints, cultural attractions)
- **OpenStreetMap** — embedded map on the result card
- **Wikipedia API** — photo and description enrichment for the selected place

## Quick start

```bash
npm install
npm run dev
```

No `.env` needed — all data sources are free and open.

## Structure

```
src/
  data/cities.ts              City type + OSM → ActivityTag inference
  hooks/
    useGeocoding.ts           Nominatim autocomplete (abort-on-stale)
    usePlaces.ts              Overpass fetch, debounced + abort-safe
    useRoulette.ts            Spin lifecycle + confetti
  components/
    OriginSearch.tsx          City search input with dropdown
    FilterPanel.tsx           Radius slider + activity tag filters
    SpinButton.tsx            The big red button
    SlotMachine.tsx           Cycling-names reveal animation
    ResultCard.tsx            Bottom-sheet result with map + directions
    MapEmbed.tsx              OpenStreetMap iframe
  App.tsx                     State orchestration + Wikipedia enrichment
```

## Deployment

Pushes to `main` deploy automatically to GitHub Pages via `.github/workflows/deploy.yml`.

To enable on a fork: go to **Settings → Pages** and set **Source** to **GitHub Actions**.
