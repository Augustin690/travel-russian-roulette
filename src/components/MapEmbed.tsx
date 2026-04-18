import { useEffect, useRef } from 'react';
import { AMAP_KEY } from '../config';

interface Props {
  lng: number;
  lat: number;
  label: string;
}

/**
 * ============================================================
 * Amap (高德) JS API integration
 * ------------------------------------------------------------
 * This component lazy-loads the Amap Web JS API when it is first
 * needed. The API key lives in src/config.ts as AMAP_KEY — edit
 * that constant with your own key before deploying. No .env
 * required; the key is public by design (restrict it to your
 * domain inside the Amap console for safety).
 *
 * Docs: https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare
 * ============================================================
 */

declare global {
  interface Window {
    AMap?: any;
    _amapLoaderPromise?: Promise<any>;
  }
}

function loadAmap(): Promise<any> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window._amapLoaderPromise) return window._amapLoaderPromise;

  window._amapLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
    script.async = true;
    script.onload = () => resolve(window.AMap);
    script.onerror = () =>
      reject(new Error('Amap script failed to load — check AMAP_KEY in src/config.ts'));
    document.head.appendChild(script);
  });

  return window._amapLoaderPromise;
}

export default function MapEmbed({ lng, lat, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    loadAmap()
      .then((AMap) => {
        if (cancelled || !ref.current) return;
        mapRef.current = new AMap.Map(ref.current, {
          center: [lng, lat],
          zoom: 10,
          viewMode: '2D',
          // The user can switch to a custom dark-themed style here.
          // mapStyle: 'amap://styles/darkblue',
        });
        const marker = new AMap.Marker({
          position: [lng, lat],
          title: label,
        });
        mapRef.current.add(marker);
      })
      .catch((err) => {
        // Fall back silently — the rest of the card is still usable.
        // eslint-disable-next-line no-console
        console.warn(err);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [lng, lat, label]);

  const keyMissing = !AMAP_KEY || AMAP_KEY.startsWith('YOUR_');

  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-cream/10">
      <div ref={ref} className="absolute inset-0 bg-ink-700" />
      {keyMissing && (
        <div className="absolute inset-0 flex items-center justify-center text-center p-3 bg-ink-700/95">
          <p className="text-[11px] text-cream/60 leading-relaxed">
            Map preview disabled — paste your Amap JS API key into
            <br />
            <code className="text-vermilion">src/config.ts → AMAP_KEY</code>
          </p>
        </div>
      )}
    </div>
  );
}
