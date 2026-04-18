import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FilterPanel from './components/FilterPanel';
import SpinButton from './components/SpinButton';
import SlotMachine from './components/SlotMachine';
import ResultCard from './components/ResultCard';
import { useFilteredCities, type Filters } from './hooks/useFilteredCities';
import { useRoulette } from './hooks/useRoulette';

export default function App() {
  const [filters, setFilters] = useState<Filters>({
    radiusKm: 200,
    transport: 'both',
    activities: [],
  });

  const pool = useFilteredCities(filters);
  const { state, winner, spin, reset, progress } = useRoulette();
  const [error, setError] = useState<string | null>(null);

  const spinning = state === 'spinning';
  const revealed = state === 'revealed';

  const handleSpin = () => {
    if (pool.length === 0) {
      setError('No cities match — try widening your filters · 无匹配城市，请放宽条件');
      return;
    }
    setError(null);
    spin(pool);
  };

  const handleAgain = () => {
    reset();
    setError(null);
  };

  return (
    <div className="relative min-h-full w-full flex justify-center bg-ink">
      {/* Progress bar */}
      <AnimatePresence>
        {spinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 inset-x-0 h-1 bg-ink-700 z-50"
          >
            <motion.div
              className="h-full bg-vermilion origin-left"
              style={{ scaleX: progress }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[420px] min-h-full px-5 pt-10 pb-32 flex flex-col">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-extrabold text-cream">轮盘旅行</h1>
            <span className="text-sm text-cream/50">Roulette Trip</span>
          </div>
          <p className="text-xs text-cream/50 mt-1 leading-relaxed">
            Pick your criteria, pull the trigger. One randomly chosen day trip
            from 上海 · Shanghai.
          </p>
        </header>

        {/* Slot machine (only visible during spin / reveal preview) */}
        <AnimatePresence>
          {(spinning || revealed) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-6"
            >
              <SlotMachine
                pool={pool}
                winner={winner}
                progress={progress}
                spinning={spinning}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters — hidden while spinning for focus */}
        {!spinning && !revealed && (
          <FilterPanel
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              if (error) setError(null);
            }}
            eligibleCount={pool.length}
            disabled={spinning}
          />
        )}

        {/* Spin button */}
        {!revealed && (
          <div className="mt-auto pt-10 flex justify-center">
            <SpinButton
              onClick={handleSpin}
              disabled={spinning}
              spinning={spinning}
              error={error}
            />
          </div>
        )}
      </div>

      {/* Result card bottom sheet */}
      <AnimatePresence>
        {revealed && winner && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/70 backdrop-blur-sm z-20"
              onClick={handleAgain}
            />
            <ResultCard
              city={winner}
              transport={filters.transport}
              onSpinAgain={handleAgain}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
