import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FilterPanel from './components/FilterPanel';
import SpinButton from './components/SpinButton';
import SlotMachine from './components/SlotMachine';
import ResultCard from './components/ResultCard';
import { usePlaces, type Origin, type PlacesFilters } from './hooks/usePlaces';
import { useRoulette } from './hooks/useRoulette';
import type { City } from './data/cities';

export default function App() {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [filters, setFilters] = useState<PlacesFilters>({
    radiusKm: 100,
    activities: [],
  });

  const { places, status: placesStatus, error: placesError } = usePlaces(origin, filters);
  const { state, winner, spin, reset, progress } = useRoulette();
  const [spinError, setSpinError] = useState<string | null>(null);

  // Enriched winner — gets image + description from Wikipedia after selection
  const [enrichedWinner, setEnrichedWinner] = useState<City | null>(null);

  useEffect(() => {
    if (!winner) { setEnrichedWinner(null); return; }
    setEnrichedWinner(winner);

    const ctrl = new AbortController();
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query` +
      `&titles=${encodeURIComponent(winner.name)}` +
      `&prop=pageimages|extracts` +
      `&format=json&pithumbsize=1200&exintro=1&explaintext=1&exchars=350&origin=*`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then((data) => {
        const pages = data.query?.pages ?? {};
        const page = Object.values(pages)[0] as Record<string, any>;
        if (!page || page.missing !== undefined) return;
        setEnrichedWinner((prev) =>
          prev
            ? {
                ...prev,
                image: page.thumbnail?.source ?? prev.image,
                description: page.extract ?? prev.description,
              }
            : null,
        );
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [winner?.id]);

  const spinning = state === 'spinning';
  const revealed = state === 'revealed';

  const handleSpin = () => {
    if (!origin) {
      setSpinError('Set your starting city first');
      return;
    }
    if (placesStatus === 'loading') {
      setSpinError('Still loading places — wait a moment');
      return;
    }
    if (placesStatus === 'error') {
      setSpinError(placesError ?? 'Could not load places');
      return;
    }
    if (places.length === 0) {
      setSpinError('No places found — try widening your radius or changing filters');
      return;
    }
    setSpinError(null);
    spin(places);
  };

  const handleAgain = () => {
    reset();
    setSpinError(null);
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
            Set your city, spin the wheel, and discover your next day trip.
          </p>
        </header>

        {/* Slot machine (only visible during spin / reveal) */}
        <AnimatePresence>
          {(spinning || revealed) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-6"
            >
              <SlotMachine
                pool={places}
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
            origin={origin}
            onOriginSelect={(o) => {
              setOrigin(o);
              setSpinError(null);
            }}
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              if (spinError) setSpinError(null);
            }}
            eligibleCount={places.length}
            placesStatus={placesStatus}
            disabled={spinning}
          />
        )}

        {/* Spin button */}
        {!revealed && (
          <div className="mt-auto pt-10 flex justify-center">
            <SpinButton
              onClick={handleSpin}
              disabled={spinning || placesStatus === 'loading'}
              spinning={spinning}
              error={spinError}
            />
          </div>
        )}
      </div>

      {/* Result card bottom sheet */}
      <AnimatePresence>
        {revealed && enrichedWinner && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/70 backdrop-blur-sm z-20"
              onClick={handleAgain}
            />
            <ResultCard
              city={enrichedWinner}
              originDisplayName={origin?.displayName ?? ''}
              onSpinAgain={handleAgain}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
