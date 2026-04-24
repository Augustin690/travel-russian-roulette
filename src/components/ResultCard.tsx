import { motion } from 'framer-motion';
import type { City } from '../data/cities';
import { tagColor } from './FilterPanel';
import MapEmbed from './MapEmbed';
import { useLang } from '../LangContext';

interface Props {
  city: City;
  originDisplayName: string;
  onSpinAgain: () => void;
}

export default function ResultCard({ city, originDisplayName, onSpinAgain }: Props) {
  const { t } = useLang();
  const osmUrl = `https://www.openstreetmap.org/directions?route=${encodeURIComponent(originDisplayName)};${city.lat},${city.lng}`;

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[420px]
        bg-ink-800 rounded-t-3xl border-t border-x border-cream/10
        shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.6)]
        max-h-[92vh] overflow-y-auto"
    >
      {/* drag handle */}
      <div className="sticky top-0 pt-2 pb-1 bg-ink-800 z-10 flex justify-center">
        <div className="w-10 h-1 rounded-full bg-cream/15" />
      </div>

      {/* cover image or gradient placeholder */}
      <div className="relative h-44 -mt-3 bg-ink-700">
        {city.image ? (
          <img
            src={city.image}
            alt={city.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-700 via-ink-800 to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-800 via-transparent to-transparent" />
      </div>

      <div className="px-5 pb-6 -mt-10 relative space-y-5">
        {/* title */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-vermilion mb-1">
            {t.kmAway(city.distanceKm)}
          </div>
          <h2 className="text-3xl font-extrabold text-cream leading-none">
            {city.name}
          </h2>
          {city.osmTags['name:en'] && city.osmTags['name:en'] !== city.name && (
            <div className="text-base text-cream/60 mt-1">{city.osmTags['name:en']}</div>
          )}
        </div>

        {/* badges */}
        <div className="flex flex-wrap gap-2">
          <Badge label={`${city.distanceKm} km`} sub={t.distanceBadge} />
          {city.osmTags.ele && (
            <Badge label={`${city.osmTags.ele} m`} sub={t.elevationBadge} />
          )}
          {city.osmTags.wikidata && (
            <Badge label={t.wikiBadge} sub={t.infoAvailableBadge} />
          )}
        </div>

        {/* tag chips */}
        <div className="flex flex-wrap gap-1.5">
          {city.tags.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-1 rounded-full text-[11px] font-semibold ${tagColor(tag)}`}
            >
              {t.tagLabels[tag]}
            </span>
          ))}
        </div>

        {/* description from Wikipedia */}
        {city.description && (
          <div>
            <h3 className="text-xs tracking-[0.25em] uppercase text-cream/50 mb-2">
              {t.aboutSection}
            </h3>
            <p className="text-sm text-cream/70 leading-relaxed">{city.description}</p>
          </div>
        )}

        {/* loading indicator while enriching */}
        {!city.description && !city.image && (
          <div className="flex items-center gap-2 text-[11px] text-cream/30">
            <div className="w-3 h-3 rounded-full border border-cream/20 border-t-cream/50 animate-spin" />
            {t.loadingDetails}
          </div>
        )}

        {/* map */}
        <div>
          <h3 className="text-xs tracking-[0.25em] uppercase text-cream/50 mb-2">
            {t.onTheMap}
          </h3>
          <MapEmbed lng={city.lng} lat={city.lat} label={city.name} />
        </div>

        {/* actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onSpinAgain}
            className="py-3 rounded-xl font-semibold text-sm bg-ink-700 text-cream/80
              border border-cream/10 hover:bg-ink-700/60 transition"
          >
            {t.spinAgain}
          </button>
          <a
            href={osmUrl}
            target="_blank"
            rel="noreferrer"
            className="py-3 rounded-xl font-semibold text-sm bg-vermilion text-cream
              hover:bg-vermilion-dark transition text-center"
          >
            {t.imGoing}
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function Badge({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="px-3 py-1.5 rounded-lg bg-ink-700 border border-cream/10">
      <div className="text-sm font-semibold text-cream leading-none">{label}</div>
      <div className="text-[9px] uppercase tracking-widest text-cream/50 mt-0.5">{sub}</div>
    </div>
  );
}
