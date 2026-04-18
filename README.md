# 轮盘旅行 · Roulette Trip

A Russian-roulette-style day-trip planner seeded from Shanghai. Set your criteria, hit spin, and one randomly chosen destination is revealed with drama.

## Stack
- React 18 + Vite (TypeScript)
- Tailwind CSS
- Framer Motion
- canvas-confetti
- Amap (高德) Web JS API (embedded map)

## Quick start
```bash
npm install
npm run dev
```

## Configuration
Paste your Amap Web JS API key into `src/config.ts`:
```ts
export const AMAP_KEY = 'YOUR_AMAP_JS_API_KEY_HERE';
```
Register a free key at https://lbs.amap.com/ under Web端(JS API). Until you do, the card shows a placeholder instead of a live map — everything else works.

## Structure
```
src/
  data/cities.ts         25-city seed set around Shanghai
  components/
    FilterPanel.tsx      radius slider, transport toggle, activity chips
    SpinButton.tsx       the big red button
    SlotMachine.tsx      cycling-names reveal animation
    ResultCard.tsx       bottom-sheet result
    MapEmbed.tsx         Amap integration — paste your key in src/config.ts
  hooks/
    useFilteredCities.ts pool based on radius / transport / tags
    useRoulette.ts       spin lifecycle + confetti
  App.tsx
  main.tsx
  config.ts              AMAP_KEY lives here
```
