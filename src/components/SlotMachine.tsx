import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { City } from '../data/cities';
import { useLang } from '../LangContext';

interface Props {
  pool: City[];
  winner: City | null;
  progress: number; // 0..1
  spinning: boolean;
}

export default function SlotMachine({ pool, winner, progress, spinning }: Props) {
  const { t } = useLang();
  const [idx, setIdx] = useState(0);
  const lastTickRef = useRef(0);
  const accumRef = useRef(0);

  // Interval eases from ~40 ms (fast) to ~220 ms (slow) as progress → 1
  const intervalMs = 40 + Math.pow(progress, 2) * 200;

  const names = useMemo(() => {
    if (pool.length === 0 && winner) return [winner];
    return pool;
  }, [pool, winner]);

  useEffect(() => {
    if (!spinning || names.length === 0) return;
    let raf = 0;
    const step = (t: number) => {
      if (lastTickRef.current === 0) lastTickRef.current = t;
      const dt = t - lastTickRef.current;
      lastTickRef.current = t;
      accumRef.current += dt;
      if (accumRef.current >= intervalMs) {
        accumRef.current = 0;
        setIdx((i) => (i + 1) % names.length);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      lastTickRef.current = 0;
      accumRef.current = 0;
    };
  }, [spinning, intervalMs, names.length]);

  const showWinner = !spinning && winner;
  const displayed = showWinner ? winner : names[idx % Math.max(names.length, 1)];

  if (!displayed) return null;

  const blurPx = spinning ? Math.max(0, 6 * (1 - progress)) : 0;

  // Show a short type label while spinning, localised destination label when revealed
  const subLabel = showWinner
    ? t.yourDestination
    : (t.tagLabels[displayed.tags[0]] ?? displayed.tags[0] ?? 'place');

  return (
    <div className="relative h-36 flex items-center justify-center overflow-hidden rounded-2xl bg-ink-800/60 border border-cream/10">
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-ink to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink to-transparent pointer-events-none" />
      <motion.div
        key={displayed.id + (showWinner ? '-locked' : '')}
        initial={{ y: spinning ? -20 : 0, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={
          showWinner
            ? { type: 'spring', stiffness: 160, damping: 14 }
            : { duration: 0.08 }
        }
        style={{ filter: `blur(${blurPx}px)` }}
        className="text-center px-4"
      >
        <div className="text-3xl font-extrabold text-cream tracking-wide">
          {displayed.name}
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cream/40 mt-2">
          {subLabel}
          {!showWinner && displayed.distanceKm > 0 && (
            <span className="ml-2 text-cream/30">· {displayed.distanceKm} km</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
