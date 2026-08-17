import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Owns the MapLibre instance and nothing else.
 *
 * Deliberately empty for now: no basemap is wired up, because the basemap is a
 * licensing decision, not a default. The previous implementation depended on
 * community raster tiles whose terms do not cover production use. Layers will
 * arrive later as declarative specs reconciled against the style, rather than
 * as imperative branches inside this component.
 *
 * This module is loaded lazily — MapLibre must never sit on the critical path
 * of a page that only shows a list.
 */

const EMPTY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#eef2f6' },
    },
  ],
};

const LUXEMBOURG_CENTER: [number, number] = [6.13, 49.75];

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: EMPTY_STYLE,
      center: LUXEMBOURG_CENTER,
      zoom: 8,
      attributionControl: false,
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map of Luxembourg (no layers loaded yet)"
      className="h-[420px] w-full rounded border border-slate-200 dark:border-slate-800"
    />
  );
}
