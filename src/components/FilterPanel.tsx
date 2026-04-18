import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ActivityTag } from '../data/cities';
import type { Filters, TransportMode } from '../hooks/useFilteredCities';

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  eligibleCount: number;
  disabled: boolean;
}

const ALL_TAGS: ActivityTag[] = [
  'ancient-town',
  'nature',
  'food',
  'museum',
  'beach',
  'mountain',
  'modern',
];

const TAG_LABEL: Record<ActivityTag, { en: string; zh: string }> = {
  'ancient-town': { en: 'Ancient town', zh: '古镇' },
  nature: { en: 'Nature', zh: '自然' },
  food: { en: 'Food', zh: '美食' },
  museum: { en: 'Museum', zh: '博物馆' },
  beach: { en: 'Beach', zh: '海滩' },
  mountain: { en: 'Mountain', zh: '山岳' },
  modern: { en: 'Modern', zh: '都市' },
};

export function tagColor(tag: ActivityTag): string {
  // Pastel + ink-navy friendly palette
  const map: Record<ActivityTag, string> = {
    'ancient-town': 'bg-[#f4d7c1] text-[#7a3a1e]',
    nature: 'bg-[#c8e6c9] text-[#1e4620]',
    food: 'bg-[#fbdad2] text-[#8a2c1f]',
    museum: 'bg-[#d9d2f2] text-[#3a2e7a]',
    beach: 'bg-[#c9e7f5] text-[#0d3d54]',
    mountain: 'bg-[#d4dfc9] text-[#2f4a26]',
    modern: 'bg-[#f3e3a9] text-[#624a0d]',
  };
  return map[tag];
}

export default function FilterPanel({
  filters,
  onChange,
  eligibleCount,
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

  const setTransport = (t: TransportMode) =>
    onChange({ ...filters, transport: t });

  return (
    <div
      className={`space-y-6 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      {/* Radius */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-cream/80">
              Radius <span className="text-cream/40 font-normal">半径</span>
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
            <span className="mx-1.5 text-cream/40">·</span>
            <span className="text-vermilion">{eligibleCount}</span>
            <span className="text-cream/50"> cities</span>
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
              Radius is crow-flies distance from Shanghai — actual train or
              drive time may be much higher (e.g. Putuoshan sits on an island).
            </motion.div>
          )}
        </AnimatePresence>
        <input
          type="range"
          min={50}
          max={300}
          step={10}
          value={filters.radiusKm}
          onChange={(e) =>
            onChange({ ...filters, radiusKm: Number(e.target.value) })
          }
          className="w-full accent-vermilion"
        />
        <div className="flex justify-between text-[10px] text-cream/40 mt-1">
          <span>50</span>
          <span>175</span>
          <span>300</span>
        </div>
      </section>

      {/* Transport */}
      <section>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-cream/80 mb-2">
          Transport <span className="text-cream/40 font-normal">交通</span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(['train', 'drive', 'both'] as TransportMode[]).map((t) => {
            const active = filters.transport === t;
            const label =
              t === 'train' ? '高铁 Train' : t === 'drive' ? '自驾 Drive' : '全部 Both';
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTransport(t)}
                className={`py-2 rounded-full text-xs font-semibold transition-all
                  ${
                    active
                      ? 'bg-vermilion text-cream shadow-[0_0_0_1px_rgba(255,255,255,0.15)]'
                      : 'bg-ink-700 text-cream/70 hover:bg-ink-700/70'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Activities */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-cream/80">
            Activity <span className="text-cream/40 font-normal">活动</span>
          </h3>
          {filters.activities.length === 0 ? (
            <span className="text-[10px] text-cream/40">Any · 任意</span>
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
                {TAG_LABEL[tag].en}
                <span className="ml-1 text-[9px] opacity-60">
                  {TAG_LABEL[tag].zh}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
