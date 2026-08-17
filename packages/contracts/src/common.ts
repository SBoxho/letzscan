import { z } from 'zod';

/**
 * Shared primitives used by more than one canonical entity.
 *
 * Rules that apply everywhere:
 *  - Identifiers are stable, lowercase and machine-chosen. Human names are
 *    presentation only and must never be used as a join key.
 *  - Every timestamp is ISO 8601 with an explicit offset. Storage is UTC;
 *    `Europe/Luxembourg` is a rendering concern.
 */

/** Stable machine identifier: `statec-lustat`, `population.total`, `lu.commune.0311`. */
export const StableId = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z0-9][a-z0-9._:-]*$/,
    'Identifiers are lowercase and may contain digits, dot, colon, underscore and hyphen.',
  );

/** Calendar date, no time component. */
export const IsoDate = z.iso.date();

/** Instant with an explicit UTC offset. */
export const Timestamp = z.iso.datetime({ offset: true });

/**
 * The period an observation applies to.
 *
 * Accepts a year (`2025`), month (`2025-03`), day (`2025-03-04`), quarter
 * (`2025-Q1`), ISO week (`2025-W07`), an instant, or a `start/end` interval.
 */
export const Period = z
  .string()
  .regex(
    /^(?:\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?|\d{4}-Q[1-4]|\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])|\d{4}-\d{2}-\d{2}T[0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-][0-2]\d:[0-5]\d))(?:\/(?:\d{4}(?:-\d{2}(?:-\d{2})?)?|\d{4}-Q[1-4]|\d{4}-\d{2}-\d{2}T[0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-][0-2]\d:[0-5]\d)))?$/,
    'Period must be an ISO 8601 year, month, day, quarter, week, instant or interval.',
  );

/**
 * How often the upstream distribution changes. Drives freshness expectations,
 * cron cadence and cache TTLs — never guessed in the UI.
 */
export const Cadence = z.enum([
  'realtime',
  'sub_hourly',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
  'irregular',
  'static',
]);

/** How LëtzScan is allowed to reach the distribution. */
export const AccessMode = z.enum(['open', 'registration', 'api_key', 'approval']);

/**
 * Licence of one *distribution*, never of a portal as a whole. A blanket
 * "everything on the portal is CC0" assumption is how attribution goes wrong.
 */
export const Licence = z.object({
  /** SPDX identifier where one exists, otherwise `other-open` or `unknown`. */
  spdx: z.string().min(1),
  url: z.url().optional(),
  /** Exact attribution string to render next to any derived view or download. */
  attribution: z.string().min(1),
  notes: z.string().optional(),
});

/**
 * GeoJSON geometry. Structural validation only — coordinate semantics and
 * winding order are checked by geospatial tooling in the pipeline, not here.
 */
export const Geometry = z.object({
  type: z.enum(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']),
  coordinates: z.unknown(),
});

export type StableId = z.infer<typeof StableId>;
export type IsoDate = z.infer<typeof IsoDate>;
export type Timestamp = z.infer<typeof Timestamp>;
export type Period = z.infer<typeof Period>;
export type Cadence = z.infer<typeof Cadence>;
export type AccessMode = z.infer<typeof AccessMode>;
export type Licence = z.infer<typeof Licence>;
export type Geometry = z.infer<typeof Geometry>;
