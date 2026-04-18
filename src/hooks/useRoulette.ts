import { useCallback, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { City } from '../data/cities';

export type RouletteState = 'idle' | 'spinning' | 'revealed';

interface UseRouletteReturn {
  state: RouletteState;
  winner: City | null;
  spin: (pool: City[]) => void;
  reset: () => void;
  progress: number; // 0..1 during spin, for top progress bar
}

const SPIN_DURATION_MS = 2500;

export function useRoulette(): UseRouletteReturn {
  const [state, setState] = useState<RouletteState>('idle');
  const [winner, setWinner] = useState<City | null>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const spin = useCallback((pool: City[]) => {
    if (pool.length === 0) return;

    // Pick winner upfront — the slot machine is a visual flourish, not the RNG.
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setWinner(chosen);
    setState('spinning');
    setProgress(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / SPIN_DURATION_MS, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setState('revealed');
        // Celebratory burst — fires once, centred slightly above card top.
        confetti({
          particleCount: 90,
          spread: 70,
          startVelocity: 45,
          origin: { x: 0.5, y: 0.45 },
          colors: ['#e84c3d', '#f5f0e8', '#f4c95d', '#2a9d8f'],
          scalar: 0.9,
        });
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setWinner(null);
    setState('idle');
    setProgress(0);
  }, []);

  return { state, winner, spin, reset, progress };
}
