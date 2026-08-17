import { z } from 'zod';
import { IsoDate, StableId } from './common.js';

export const GeographyLevel = z.enum([
  'country',
  'district',
  'canton',
  'commune',
  'quarter',
  'locality',
]);

/**
 * One place, in one boundary version.
 *
 * Communes merge and get renamed. `id` is stable within a geography set;
 * `code` is the official code as published; `name` is presentation only.
 */
export const Geography = z
  .object({
    id: StableId,
    set_id: StableId,
    /** Official code exactly as the producer publishes it (LAU, INS, ...). */
    code: z.string().min(1),
    name: z.string().min(1),
    level: GeographyLevel,
    parent_id: StableId.optional(),
    valid_from: IsoDate,
    /** Absent while the geography is current. */
    valid_to: IsoDate.optional(),
  })
  .meta({
    id: 'Geography',
    title: 'Geography',
    description: 'A single place in a single boundary version.',
  });

/**
 * A versioned family of geographies, e.g. "communes as of 2024".
 *
 * Catalogue files under `catalog/geographies/` declare the set. The gazetteer
 * itself is produced by the pipeline from an authoritative source, so `members`
 * is usually empty in the catalogue and populated in the published artifact.
 */
export const GeographySet = z
  .object({
    id: StableId,
    title: z.string().min(1),
    level: GeographyLevel,
    /** Naming scheme of `Geography.code`, e.g. `LAU`, `ISO-3166-2`, `VDL-quarter`. */
    code_scheme: z.string().min(1),
    source_id: StableId,
    valid_from: IsoDate,
    valid_to: IsoDate.optional(),
    description: z.string().optional(),
    /** Crosswalks to previous sets, added when boundaries actually change. */
    supersedes: z.array(StableId).default([]),
    members: z.array(Geography).default([]),
  })
  .meta({
    id: 'GeographySet',
    title: 'GeographySet',
    description: 'A versioned family of geographies plus its crosswalk lineage.',
  });

export type GeographyLevel = z.infer<typeof GeographyLevel>;
export type Geography = z.infer<typeof Geography>;
export type GeographySet = z.infer<typeof GeographySet>;
