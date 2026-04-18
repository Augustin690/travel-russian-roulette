import { motion } from 'framer-motion';
import type { City } from '../data/cities';
import type { TransportMode } from '../hooks/useFilteredCities';
import { tagColor } from './FilterPanel';
import MapEmbed from './MapEmbed';

interface Props {
  city: City;
  transport: TransportMode;
  onSpinAgain: () => void;
}

function fmtMinutes(mins: number): string {
  if (mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h}h ${m}m`;
}

export default function ResultCard({ city, transport, onSpinAgain }: Props) {
  // Pick the travel-time badge label based on the transport filter.
  const showTrain = transport !== 'drive' && city.trainMinutes > 0;
  const showDrive = transport !== 'train' && city.driveMinutes > 0;

  const googleMapsUrl = `https://www.google.com/maps/dir/Shanghai,China/${encodeURIComponent(
    city.nameEn
  )},China`;

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

      {/* cover image */}
      <div className="relative h-44 -mt-3">
        <img
          src={city.coverImage}
          alt={city.nameEn}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-800 via-transparent to-transparent" />
      </div>

      <div className="px-5 pb-6 -mt-10 relative space-y-5">
        {/* title */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-vermilion mb-1">
            {city.province} 省
          </div>
          <h2 className="text-3xl font-extrabold text-cream leading-none">
            {city.nameEn}
          </h2>
          <div className="text-xl text-cream/70 mt-1">{city.nameZh}</div>
        </div>

        {/* badges */}
        <div className="flex flex-wrap gap-2">
          <Badge label={`${city.distanceKm} km`} sub="距离" />
          {showTrain && (
            <Badge label={`🚄 ${fmtMinutes(city.trainMinutes)}`} sub="高铁" />
          )}
          {showDrive && (
            <Badge label={`🚗 ${fmtMinutes(city.driveMinutes)}`} sub="自驾" />
          )}
          <Badge label={`${city.population.toLocaleString()}k`} sub="人口" />
        </div>

        {/* tag chips */}
        <div className="flex flex-wrap gap-1.5">
          {city.tags.map((t) => (
            <span
              key={t}
              className={`px-2 py-1 rounded-full text-[11px] font-semibold ${tagColor(
                t
              )}`}
            >
              {t}
            </span>
          ))}
        </div>

        {/* highlights */}
        <div>
          <h3 className="text-xs tracking-[0.25em] uppercase text-cream/50 mb-2">
            Highlights · 亮点
          </h3>
          <ol className="space-y-2">
            {city.highlights.map((h, i) => (
              <li key={i} className="flex gap-3 text-sm text-cream/90">
                <span className="w-6 h-6 flex-none rounded-full bg-vermilion text-cream text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-snug pt-0.5">{h}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* map */}
        <div>
          <h3 className="text-xs tracking-[0.25em] uppercase text-cream/50 mb-2">
            On the map · 地图
          </h3>
          <MapEmbed lng={city.lng} lat={city.lat} label={city.nameEn} />
        </div>

        {/* actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onSpinAgain}
            className="py-3 rounded-xl font-semibold text-sm bg-ink-700 text-cream/80
              border border-cream/10 hover:bg-ink-700/60 transition"
          >
            Spin again
            <div className="text-[10px] font-normal opacity-60">再转一次</div>
          </button>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="py-3 rounded-xl font-semibold text-sm bg-vermilion text-cream
              hover:bg-vermilion-dark transition text-center"
          >
            I'm going! →
            <div className="text-[10px] font-normal opacity-80">出发</div>
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
      <div className="text-[9px] uppercase tracking-widest text-cream/50 mt-0.5">
        {sub}
      </div>
    </div>
  );
}
