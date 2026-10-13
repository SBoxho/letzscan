import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { LicensedBasemap } from './basemap-data';
import { styleFor } from './basemap-style';

// MapLibre 6 locates its worker with `new URL('./maplibre-gl-worker.mjs',
// import.meta.url)`, which Vite does not follow. Left alone, the worker 404s in
// dev and is answered with index.html by an SPA fallback in production, and no
// source ever loads. `?worker&url` makes Vite bundle it as its own chunk;
// vite.config.ts fails the build if that chunk ever goes missing.
maplibregl.setWorkerUrl(workerUrl);

/**
 * Owns the MapLibre instance and nothing else.
 *
 * The basemap is a licensing decision, not a default, so it arrives as data: a
 * reviewed `catalog/basemaps/` entry and the source that licenses it (see
 * docs/adr/0008-basemap.md). Without one the map shows a plain background.
 * Layers will arrive later as declarative specs reconciled against the style,
 * rather than as imperative branches inside this component.
 *
 * This module is loaded lazily — MapLibre must never sit on the critical path
 * of a page that only shows a list.
 */

const LUXEMBOURG_CENTER: [number, number] = [6.13, 49.75];

export default function MapCanvas({ basemap }: { basemap: LicensedBasemap | null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: styleFor(basemap),
      center: LUXEMBOURG_CENTER,
      zoom: 8,
      // Attribution is rendered below from the source record, as text: React
      // escapes it, where MapLibre's control would insert catalogue text as HTML.
      attributionControl: false,
    });

    return () => {
      map.remove();
    };
  }, [basemap]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        role="application"
        aria-label={
          basemap
            ? `Map of Luxembourg on the ${basemap.basemap.title} basemap`
            : 'Map of Luxembourg (no basemap loaded)'
        }
        className="h-[420px] w-full rounded border border-slate-200 dark:border-slate-800"
      />
      {basemap && (
        <p className="absolute right-0 bottom-0 max-w-full rounded-tl bg-white/85 px-1.5 py-0.5 text-[11px] leading-tight text-slate-700">
          {basemap.source.licence.attribution}
        </p>
      )}
    </div>
  );
}
