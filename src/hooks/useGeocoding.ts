import { useCallback, useRef, useState } from 'react';

export interface GeocodingResult {
  displayName: string;
  shortName: string;
  lat: number;
  lng: number;
}

interface State {
  status: 'idle' | 'loading' | 'error';
  results: GeocodingResult[];
  error: string | null;
}

export function useGeocoding() {
  const [state, setState] = useState<State>({ status: 'idle', results: [], error: null });
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState({ status: 'idle', results: [], error: null });
      return;
    }

    // Cancel any in-flight request so stale responses don't overwrite newer ones.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'loading', results: [], error: null });
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
      setState({
        status: 'idle',
        results: data.map((r) => ({
          displayName: r.display_name,
          shortName: r.display_name.split(',')[0].trim(),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })),
        error: null,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState({
        status: 'error',
        results: [],
        error: 'Could not find that location — try a different spelling.',
      });
    }
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: 'idle', results: [], error: null });
  }, []);

  return { ...state, search, clear };
}
