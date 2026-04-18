import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { City } from '../data/cities';

interface Props {
  pool: City[];
  winner: City | null;
  progress: number; // 0..1
  spinning: boolean;
}

/**
 * Fake slot-machine reel. The winner is decided outside;
 * we just cycle names faster at the start and slow down at the end
 * before revealing the locked pick.
 */
export default function SlotMachine({ pool, winner, progress, spinning }: Props) {
  const [idx, setIdx] = useState(0);
  const lastTickRef = useRef(0);
  const accumRef = useRef(0);

  // Easing: frames per second starts high, ends low.
  // intervalMs goes from ~40ms at progress=0 to ~220ms at progress=1.
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

  // When the spin ends and we have a winner, force-show the winner.
  const showWinner = !spinning && winner;
  const displayed = showWinner ? winner : names[idx % Math.max(names.length, 1)];

  if (!displayed) return null;

  // Blur decays as progress approaches 1 — names come into focus.
  const blurPx = spinning ? Math.max(0, 6 * (1 - progress)) : 0;

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
          {displayed.nameEn}
        </div>
        <div className="text-lg text-cream/70 mt-1">{displayed.nameZh}</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cream/40 mt-2">
          {showWinner ? 'Your destination · 命中' : displayed.province}
        </div>
      </motion.div>
    </div>
  );
}
