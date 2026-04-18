import { useEffect, useRef, useState } from 'react';
import { useGeocoding, type GeocodingResult } from '../hooks/useGeocoding';
import type { Origin } from '../hooks/usePlaces';

interface Props {
  origin: Origin | null;
  onSelect: (origin: Origin | null) => void;
  disabled?: boolean;
}

export default function OriginSearch({ origin, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { status, results, error, search, clear } = useGeocoding();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length >= 2) {
      debounceRef.current = setTimeout(() => search(q), 420);
    } else {
      clear();
    }
  };

  const handleSelect = (r: GeocodingResult) => {
    onSelect({ lat: r.lat, lng: r.lng, displayName: r.shortName });
    setQuery('');
    setOpen(false);
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (origin) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-ink-700 border border-cream/10">
        <span className="text-xs text-cream/50 shrink-0">From</span>
        <span className="text-sm text-cream font-medium flex-1 truncate">{origin.displayName}</span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          disabled={disabled}
          className="text-[11px] text-vermilion hover:text-cream/80 transition shrink-0"
          aria-label="Change origin city"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Enter your city — Paris, Tokyo, São Paulo…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          disabled={disabled}
          aria-label="Search for your city"
          className="w-full px-4 py-3 pr-10 rounded-xl bg-ink-700 border border-cream/20
            text-cream text-sm placeholder:text-cream/30 outline-none
            focus:border-vermilion/60 transition disabled:opacity-50"
        />
        {status === 'loading' && (
          <div className="absolute right-3 top-3.5 w-4 h-4 rounded-full border-2 border-cream/20 border-t-cream/70 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute top-full mt-1 w-full bg-ink-800 border border-cream/10 rounded-xl overflow-hidden z-50 shadow-2xl">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(r)}
                className="w-full px-4 py-2.5 text-left hover:bg-ink-700 transition"
              >
                <div className="text-sm font-medium text-cream">{r.shortName}</div>
                <div className="text-[10px] text-cream/40 mt-0.5 truncate">{r.displayName}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-[11px] text-vermilion mt-1.5 px-1">{error}</p>
      )}
    </div>
  );
}
