import { useQuery } from '@tanstack/react-query';
import { Basemap, Source } from '@letzscan/contracts';
import { byId, fetchRelease } from '../lib/release';

/**
 * The basemap the map draws, and the source whose licence governs it.
 *
 * Both arrive from `catalog/` through the published release, exactly like a
 * dataset's source: the tile URL and the attribution are data, never strings in
 * a component. `null` means the release publishes no active basemap — the map
 * then shows its plain background rather than inventing one.
 */

export interface LicensedBasemap {
  basemap: Basemap;
  source: Source;
}

export async function fetchBasemap(): Promise<LicensedBasemap | null> {
  const release = await fetchRelease();
  const basemaps = Object.values(await byId(release, 'catalog/basemaps/', Basemap))
    .filter((basemap) => basemap.status === 'active')
    .sort((a, b) => a.id.localeCompare(b.id));

  const basemap = basemaps[0];
  if (basemap === undefined) return null;

  const sources = await byId(release, 'catalog/sources/', Source);
  const source = sources[basemap.source_id];
  if (source === undefined) {
    // The pipeline publishes a basemap together with its source. If it did not,
    // the tiles would be drawn without the attribution their licence requires.
    throw new Error(
      `Release ${release.id} publishes basemap ${basemap.id} without its source ${basemap.source_id}`,
    );
  }

  return { basemap, source };
}

export function useBasemap() {
  return useQuery({
    queryKey: ['maps', 'basemap'],
    queryFn: fetchBasemap,
    // Immutable under the release id; only `latest` moves.
    staleTime: 5 * 60_000,
  });
}
