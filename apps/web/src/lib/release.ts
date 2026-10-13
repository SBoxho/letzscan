import type { z } from 'zod';
import { Release } from '@letzscan/contracts';
import { dataUrl, fetchContract } from './data-client';

/**
 * Reading canonical entities out of the current published release.
 *
 * The release manifest doubles as the index. It lists every path the release
 * published, so the app never has to guess an id or probe for a file that does
 * not exist.
 */

export function fetchRelease(): Promise<Release> {
  return fetchContract(dataUrl('latest.json'), Release);
}

export function pathsIn(release: Release, prefix: string): string[] {
  return release.outputs.map((output) => output.path).filter((path) => path.startsWith(prefix));
}

/** Every entity the release published under `prefix`, keyed by id. */
export async function byId<T extends { id: string }>(
  release: Release,
  prefix: string,
  schema: z.ZodType<T>,
): Promise<Record<string, T>> {
  const entities = await Promise.all(
    pathsIn(release, prefix).map((path) => fetchContract(dataUrl(`${release.id}/${path}`), schema)),
  );
  return Object.fromEntries(entities.map((entity) => [entity.id, entity]));
}
