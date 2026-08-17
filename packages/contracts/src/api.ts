import { z } from 'zod';
import { Timestamp } from './common.js';

/**
 * Contracts for LëtzScan's *own* HTTP API (apps/edge), as opposed to the
 * canonical data entities in the rest of this package.
 *
 * They live here because the Worker and the web app must agree on them, and
 * because a third party reading `/api/v1/...` deserves a written contract too.
 * They are intentionally not exported to `schemas/`: those files describe data,
 * not transport.
 */

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  /** Deployment the response came from — useful when debugging a wrong origin. */
  environment: z.enum(['local', 'staging', 'production']),
  /** Build identifier, so a stale deployment is visible rather than inferred. */
  version: z.string().min(1),
  time: Timestamp,
});

export const ApiErrorResponse = z.object({
  error: z.object({
    code: z.enum(['bad_request', 'not_found', 'upstream_unavailable', 'internal']),
    message: z.string().min(1),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;
