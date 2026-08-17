/**
 * Worker bindings.
 *
 * Two categories, and the difference matters:
 *
 *   vars      declared in wrangler.jsonc, non-sensitive, safe to log
 *   secrets   set with `wrangler secret put`, never in the repository, never
 *             logged, never included in a response body
 *
 * `wrangler types` can generate this file from wrangler.jsonc once the binding
 * list grows; it is hand-written while it is this short.
 */
export interface Env {
  // --- vars ---------------------------------------------------------------
  ENVIRONMENT: 'local' | 'staging' | 'production';
  BUILD_VERSION: string;

  // --- bindings -----------------------------------------------------------
  /** Raw, normalized and published artifacts. */
  DATA: R2Bucket;

  // --- secrets ------------------------------------------------------------
  /** Mobiliteit.lu access id. Absent until a maintainer sets it. */
  MOBILITEIT_ACCESS_ID?: string;
}

/** Binding names whose values must never leave the Worker. */
export const SECRET_BINDINGS = ['MOBILITEIT_ACCESS_ID'] as const;

/**
 * The subset of configuration that is safe to return to a client or write to a
 * log. Anything not listed here does not leave the Worker.
 */
export function publicEnvSummary(env: Env): {
  environment: Env['ENVIRONMENT'];
  version: string;
} {
  return {
    environment: env.ENVIRONMENT,
    version: env.BUILD_VERSION,
  };
}
