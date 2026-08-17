import { z } from 'zod';
import { StableId, Timestamp } from './common.js';

/** An upstream payload that went into a release, recorded so a build can be re-derived. */
export const ReleaseInput = z.object({
  source_id: StableId,
  dataset_id: StableId.optional(),
  url: z.url().optional(),
  fetched_at: Timestamp,
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().nonnegative().optional(),
});

/** A file the release published, addressed by content hash. */
export const ReleaseOutput = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().nonnegative(),
  content_type: z.string().optional(),
});

/**
 * An immutable publication unit.
 *
 * Publication is atomic: artifacts are written under an immutable release id and
 * the `latest` pointer only advances after validation passes. A failed build
 * therefore never changes what users see.
 */
export const Release = z
  .object({
    id: StableId,
    created_at: Timestamp,
    /** Version of the pipeline that produced it, for reproducibility. */
    pipeline_version: z.string().min(1),
    status: z.enum(['draft', 'published', 'failed']),
    inputs: z.array(ReleaseInput).default([]),
    outputs: z.array(ReleaseOutput).default([]),
    /** Non-fatal problems worth surfacing on /status. */
    warnings: z.array(z.string()).default([]),
  })
  .meta({
    id: 'Release',
    title: 'Release',
    description: 'An immutable publication unit with its input and output checksums.',
  });

export type ReleaseInput = z.infer<typeof ReleaseInput>;
export type ReleaseOutput = z.infer<typeof ReleaseOutput>;
export type Release = z.infer<typeof Release>;
