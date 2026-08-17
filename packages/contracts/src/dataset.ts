import { z } from 'zod';
import { Cadence, IsoDate, Period, StableId } from './common.js';

/**
 * A published LëtzScan dataset: one source distribution, normalised, with a
 * declared set of indicators over a declared geography set.
 *
 * A dataset is what a user can download and cite. It is not a file format.
 */
export const Dataset = z
  .object({
    id: StableId,
    source_id: StableId,
    title: z.string().min(1),
    description: z.string().optional(),
    /** Indicators this dataset carries. Each must exist in `catalog/indicators/`. */
    indicator_ids: z.array(StableId).min(1),
    /** Geography set the observations are keyed by. Omitted for national-only series. */
    geography_set_id: StableId.optional(),
    cadence: Cadence,
    temporal_coverage: z
      .object({
        start: Period.optional(),
        end: Period.optional(),
      })
      .optional(),
    /** Things a reader must know before comparing these numbers to anything else. */
    caveats: z.array(z.string()).default([]),
    first_published_at: IsoDate.optional(),
  })
  .meta({
    id: 'Dataset',
    title: 'Dataset',
    description: 'A normalised, citable LëtzScan dataset derived from one source.',
  });

export type Dataset = z.infer<typeof Dataset>;
