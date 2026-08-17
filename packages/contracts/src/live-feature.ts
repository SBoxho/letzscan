import { z } from 'zod';
import { Geometry, StableId, Timestamp } from './common.js';

/**
 * A current-conditions record: an incident, a warning, a gauge reading, a
 * departure, a parking count.
 *
 * The three timestamps are the point of this contract. Conflating them is the
 * single most common data-health bug in this class of system:
 *
 *   observed_at   when the measurement or event state applies
 *   published_at  when the provider says it published the payload
 *   fetched_at    when LëtzScan received the response
 *
 * "We fetched fine two minutes ago" and "upstream has not published in nine
 * days" are different facts and must render differently.
 */
export const LiveFeature = z
  .object({
    id: z.string().min(1),
    /** Feed within the source, e.g. `cita.incidents`. */
    feed_id: StableId,
    source_id: StableId,
    /** Feed-specific record type, e.g. `incident`, `warning`, `gauge`, `departure`. */
    kind: z.string().min(1),
    /** `null` when the provider gives no usable geometry. Never invented. */
    geometry: Geometry.nullable(),
    /** Normalised, feed-specific payload. Consumers read documented keys only. */
    properties: z.record(z.string(), z.unknown()).default({}),
    observed_at: Timestamp,
    published_at: Timestamp.optional(),
    fetched_at: Timestamp,
    /** Validity window, for warnings and incidents that declare one. */
    valid_from: Timestamp.optional(),
    valid_to: Timestamp.optional(),
  })
  .meta({
    id: 'LiveFeature',
    title: 'LiveFeature',
    description: 'A normalised current-conditions record with explicit provenance timestamps.',
  });

export type LiveFeature = z.infer<typeof LiveFeature>;
