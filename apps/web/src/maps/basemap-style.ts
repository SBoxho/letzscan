import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import type { LicensedBasemap } from './basemap-data';

/**
 * The MapLibre style for a catalogued basemap, or a plain background without
 * one. Imports are type-only, so nothing here pulls the map engine into a chunk.
 */

const BACKGROUND: LayerSpecification = {
  id: 'background',
  type: 'background',
  paint: { 'background-color': '#eef2f6' },
};

export function styleFor(licensed: LicensedBasemap | null): StyleSpecification {
  if (licensed === null) return { version: 8, sources: {}, layers: [BACKGROUND] };

  const { basemap } = licensed;
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: basemap.tiles,
        tileSize: basemap.tile_size,
        minzoom: basemap.min_zoom,
        maxzoom: basemap.max_zoom,
      },
    },
    layers: [BACKGROUND, { id: 'basemap', type: 'raster', source: 'basemap' }],
  };
}
