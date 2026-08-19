import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Dataset,
  type Geography,
  GeographySet,
  Indicator,
  Observation,
  Release,
  Source,
} from '@letzscan/contracts';
import { HttpError, dataUrl, fetchContract } from '../../lib/data-client';

/**
 * Reading one commune's profile out of the published artifacts.
 *
 * There is no bespoke "place profile" payload: the browser reads canonical
 * entities and joins them itself. That is why nothing here restates a licence,
 * a unit or a source name — those arrive as data, from `catalog/` via the
 * pipeline, exactly as ADR 0002 requires.
 *
 * The release manifest doubles as the index. It lists every path the release
 * published, so the app never has to guess a dataset id or probe for a file
 * that does not exist — which is what keeps "this place has no data" and "the
 * artifact could not be loaded" genuinely different answers.
 */

const Observations = z.array(Observation);

export interface PlaceProfile {
  release: Release;
  /** `null` when the id is not a commune in the published geography set. */
  geography: Geography | null;
  observations: Observation[];
  sources: Record<string, Source>;
  indicators: Record<string, Indicator>;
  datasets: Record<string, Dataset>;
}

function pathsIn(release: Release, prefix: string): string[] {
  return release.outputs.map((output) => output.path).filter((path) => path.startsWith(prefix));
}

async function byId<T extends { id: string }>(
  release: Release,
  prefix: string,
  schema: z.ZodType<T>,
): Promise<Record<string, T>> {
  const entities = await Promise.all(
    pathsIn(release, prefix).map((path) => fetchContract(dataUrl(`${release.id}/${path}`), schema)),
  );
  return Object.fromEntries(entities.map((entity) => [entity.id, entity]));
}

export function fetchRelease(): Promise<Release> {
  return fetchContract(dataUrl('latest.json'), Release);
}

export async function fetchPlaceProfile(geoId: string): Promise<PlaceProfile> {
  const release = await fetchRelease();

  const [sets, sources, indicators, datasets] = await Promise.all([
    byId(release, 'catalog/geographies/', GeographySet),
    byId(release, 'catalog/sources/', Source),
    byId(release, 'catalog/indicators/', Indicator),
    byId(release, 'catalog/datasets/', Dataset),
  ]);

  const geography =
    Object.values(sets)
      .flatMap((set) => set.members)
      .find((member) => member.id === geoId) ?? null;

  // An unknown id is answered from the gazetteer, not from a 404. A missing
  // file would be indistinguishable from a broken deployment.
  if (geography === null) {
    return { release, geography: null, observations: [], sources, indicators, datasets };
  }

  const placePath = `places/${geoId}.json`;
  const published = release.outputs.some((output) => output.path === placePath);
  const observations = published
    ? await fetchContract(dataUrl(`${release.id}/${placePath}`), Observations)
    : [];

  return { release, geography, observations, sources, indicators, datasets };
}

export function usePlaceProfile(geoId: string) {
  return useQuery({
    queryKey: ['places', 'profile', geoId],
    queryFn: () => fetchPlaceProfile(geoId),
    // Published artifacts are immutable under their release id; only the
    // `latest` pointer moves, and it moves at most daily for this source.
    staleTime: 5 * 60_000,
    retry: (failureCount, error) =>
      error instanceof HttpError && error.status === 404 ? false : failureCount < 1,
  });
}

/** Most recent observation for an indicator, by period. */
export function latestObservation(
  observations: Observation[],
  indicatorId: string,
): Observation | undefined {
  return observations
    .filter((observation) => observation.indicator_id === indicatorId)
    .sort((a, b) => a.period.localeCompare(b.period))
    .at(-1);
}

/** When LëtzScan received the payload this observation came from. */
export function fetchedAtFor(release: Release, sourceId: string): string | undefined {
  return release.inputs.find((input) => input.source_id === sourceId)?.fetched_at;
}
