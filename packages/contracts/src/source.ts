import { z } from 'zod';
import { AccessMode, Cadence, IsoDate, Licence, StableId } from './common.js';

/**
 * A reviewed upstream provider distribution.
 *
 * One reviewed YAML file per source lives in `catalog/sources/`. The catalogue
 * is the only place licence, attribution and cadence are written down; product
 * code reads them, it never restates them.
 */
export const Source = z
  .object({
    id: StableId,
    title: z.string().min(1),
    /** Publishing organisation, in its own official wording. */
    producer: z.string().min(1),
    /** Landing page a human should read before changing this file. */
    canonical_url: z.url(),
    access: AccessMode,
    licence: Licence,
    /** Date a maintainer last read the upstream terms. Re-checked on a schedule. */
    terms_checked_at: IsoDate,
    cadence: Cadence,
    /** Connector module responsible for turning this source into canonical records. */
    connector: StableId,
    /**
     * `draft` sources are catalogued but not published. `disabled` records a
     * deliberate stop with a reason, so a dark feed is never a mystery.
     */
    status: z.enum(['draft', 'active', 'disabled']).default('draft'),
    status_reason: z.string().optional(),
    /** Geographic or thematic limits a reader must know (e.g. "Luxembourg City only"). */
    coverage: z.string().optional(),
    contact: z.string().optional(),
    /** Named invariants the pipeline enforces before publication. */
    quality_rules: z.array(z.string()).default([]),
    notes: z.string().optional(),
  })
  .meta({
    id: 'Source',
    title: 'Source',
    description: 'A reviewed upstream provider distribution and its reuse terms.',
  });

export type Source = z.infer<typeof Source>;
