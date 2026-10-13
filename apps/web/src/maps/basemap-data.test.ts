import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Release } from '@letzscan/contracts';
import { fetchBasemap } from './basemap-data';
import { styleFor } from './basemap-style';

/**
 * Served from the artifacts committed under `apps/web/public/data`, so what is
 * asserted is what the pipeline actually published from `catalog/`.
 */

const DATA_ROOT = join(process.cwd(), 'public', 'data');

function serveSnapshot(transformRelease: (release: Release) => Release = (r) => r) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input).replace(/^\/data\//, '');
      try {
        const body = readFileSync(join(DATA_ROOT, path), 'utf-8');
        if (path === 'latest.json') {
          return new Response(JSON.stringify(transformRelease(Release.parse(JSON.parse(body)))));
        }
        return new Response(body, { status: 200 });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchBasemap', () => {
  it('returns the published basemap together with the source that licenses it', async () => {
    serveSnapshot();
    const licensed = await fetchBasemap();

    expect(licensed).not.toBeNull();
    expect(licensed?.basemap.status).toBe('active');
    expect(licensed?.source.id).toBe(licensed?.basemap.source_id);
    expect(licensed?.source.licence.attribution).toMatch(/OpenStreetMap contributors/);
  });

  it('answers null when the release publishes no basemap', async () => {
    serveSnapshot((release) => ({
      ...release,
      outputs: release.outputs.filter((o) => !o.path.startsWith('catalog/basemaps/')),
    }));
    expect(await fetchBasemap()).toBeNull();
  });

  it('refuses to draw tiles whose licensing source is missing from the release', async () => {
    serveSnapshot((release) => ({
      ...release,
      outputs: release.outputs.filter(
        (o) => o.path !== 'catalog/sources/act-geoportail-basemap.json',
      ),
    }));
    await expect(fetchBasemap()).rejects.toThrow(/without its source/);
  });
});

describe('styleFor', () => {
  it('draws the catalogued tiles above the background', async () => {
    serveSnapshot();
    const licensed = await fetchBasemap();
    const style = styleFor(licensed);

    expect(style.layers.map((layer) => layer.id)).toEqual(['background', 'basemap']);
    expect(style.sources.basemap).toMatchObject({
      type: 'raster',
      tiles: licensed?.basemap.tiles,
      tileSize: licensed?.basemap.tile_size,
    });
  });

  it('shows only the background when there is no basemap', () => {
    expect(styleFor(null)).toEqual({
      version: 8,
      sources: {},
      layers: [expect.objectContaining({ id: 'background' })],
    });
  });
});
