import { z } from 'zod';
import { Period, StableId } from './common.js';

/**
 * Status of a single value. `suppressed` (withheld for disclosure control) and
 * `missing` (never collected) are different facts and must render differently.
 * Neither is ever coerced to zero.
 */
export const ObservationStatus = z.enum([
  'observed',
  'provisional',
  'revised',
  'estimated',
  'suppressed',
  'missing',
]);

/**
 * The atom of the statistical model: one indicator, one place, one period.
 *
 * Long form is the storage and validation shape. The browser is served wide,
 * pre-joined materialisations built from these rows — never the other way round.
 */
export const Observation = z
  .object({
    indicator_id: StableId,
    /** `null` for a national figure. */
    geo_id: StableId.nullable(),
    period: Period,
    /** `null` whenever status is `suppressed` or `missing`. */
    value: z.union([z.number(), z.string(), z.null()]),
    unit: z.string().min(1),
    status: ObservationStatus,
    dataset_id: StableId,
    source_id: StableId,
    /** Release that produced this row. Absent while a release is still being built. */
    release_id: StableId.optional(),
  })
  .refine((o) => (o.status === 'suppressed' || o.status === 'missing' ? o.value === null : true), {
    error: 'Suppressed and missing observations must carry a null value.',
  })
  .meta({
    id: 'Observation',
    title: 'Observation',
    description: 'One indicator value for one geography and one period.',
  });

export type ObservationStatus = z.infer<typeof ObservationStatus>;
export type Observation = z.infer<typeof Observation>;
