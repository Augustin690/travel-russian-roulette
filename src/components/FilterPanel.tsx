import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ActivityTag } from '../data/cities';
import type { PlacesFilters } from '../hooks/usePlaces';
import OriginSearch from './OriginSearch';
import type { Origin } from '../hooks/usePlaces';

interface Props {
  origin: Origin | null;
  onOriginSelect: (origin: Origin | null) => void;
  filters: PlacesFilters;
  onChange: (next: PlacesFilters) => void;
  eligibleCount: number;
  placesStatus: 'idle' | 'loading' | 'error' | 'ready';
  disabled: boolean;
}

const ALL_TAGS: ActivityTag[] = [
  'historic',
  'nature',
  'museum',
  'beach',
  'mountain',
  'cultural',
  'viewpoint',
];

const TAG_LABEL: Record<ActivityTag, string> = {
  historic: 'Historic',
  nature: 'Nature',
  museum: 'Museum',
  beach: 'Beach',
  mountain: 'Mountain',
  cultural: 'Cultural',
  viewpoint: 'Viewpoint',
};

export function tagColor(tag: ActivityTag): string {
  const map: Record<ActivityTag, string> = {
    historic:  'bg-[#f4d7c1] text-[#7a3a1e]',
    nature:    'bg-[#c8e6c9] text-[#1e4620]',
    museum:    'bg-[#d9d2f2] text-[#3a2e7a]',
    beach:     'bg-[#c9e7f5] text-[#0d3d54]',
    mountain:  'bg-[#d4dfc9] text-[#2f4a26]',
    cultural:  'bg-[#f3e3a9] text-[#624a0d]',
    viewpoint: 'bg-[#fce4ec] text-[#880e4f]',
  };
  return map[tag];
}

export default function FilterPanel({
  origin,
  onOriginSelect,
  filters,
  onChange,
  eligibleCount,
  placesStatus,
  disabled,
}: Props) {
  const [tipOpen, setTipOpen] = useState(false);

  const toggleActivity = (tag: ActivityTag) => {
    const has = filters.activities.includes(tag);
    const next = has
      ? filters.activities.filter((t) => t !== tag)
      : [...filters.activities, tag];
    onChange({ ...filters, activities: next });
  };

  const countLabel = () => {
    if (!origin) return null;
    if (placesStatus === 'loading') return <span className="text-cream/40">searching…</span>;
    if (placesStatus === 'error') return <span className="text-vermilion">error</span>;
    return (
      <>
        <span className="text-vermilion">{eligibleCount}</span>
        <span className="text-cream/50"> places</span>
      </>
    );
  };

  return (
    <div className={`space-y-6 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>

      {/* Origin city */}
      <section>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-cream/80 mb-2">
          Starting from
        </h3>
        <OriginSearch origin={origin} onSelect={onOriginSelect} disabled={disabled} />
      </section>

      {/* Radius */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-cream/80">
              Radius
            </h3>
            <button
              type="button"
              onClick={() => setTipOpen((o) => !o)}
              className="w-4 h-4 rounded-full bg-cream/10 text-cream/70 text-[10px] leading-4 text-center hover:bg-cream/20"
              aria-label="About radius"
            >
              ?
            </button>
          </div>
          <div className="text-xs text-cream/70">
            <span className="font-semibold text-cream">{filters.radiusKm} km</span>
            {origin && (
              <>
                <span className="mx-1.5 text-cream/40">·</span>
                {countLabel()}
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {tipOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mb-2 text-[11px] leading-snug text-cream/60 bg-ink-700/70 border border-cream/10 rounded-lg px-3 py-2"
            >
              Crow-flies distance from your chosen city. Actual travel time depends on terrain and transport options.
            </motion.div>
          )}
        </AnimatePresence>

        <input
          type="range"
          min={20}
          max={300}
          step={10}
          value={filters.radiusKm}
          onChange={(e) => onChange({ ...filters, radiusKm: Number(e.target.value) })}
          className="w-full accent-vermilion"
          aria-label="Search radius in kilometres"
        />
        <div className="flex justify-between text-[10px] text-cream/40 mt-1">
          <span>20</span>
          <span>160</span>
          <span>300</span>
        </div>
      </section>

      {/* Activities */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-cream/80">
            Activity
          </h3>
          {filters.activities.length === 0 ? (
            <span className="text-[10px] text-cream/40">Any</span>
          ) : (
            <button
              type="button"
              onClick={() => onChange({ ...filters, activities: [] })}
              className="text-[10px] text-vermilion hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TAGS.map((tag) => {
            const active = filters.activities.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleActivity(tag)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition
                  ${
                    active
                      ? `${tagColor(tag)} ring-2 ring-vermilion`
                      : 'bg-ink-700 text-cream/70 hover:bg-ink-700/70'
                  }`}
              >
                {TAG_LABEL[tag]}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
