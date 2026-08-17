import { HealthResponse } from '@letzscan/contracts';
import { publicEnvSummary } from '../env';
import { json } from '../http';
import type { RouteHandler } from '../router';

/**
 * Liveness and deployment identity.
 *
 * It answers "which build am I talking to, and is it healthy" — nothing more.
 * Per-source freshness belongs on the published health manifest that the cron
 * writes, not on a request-time endpoint.
 *
 * The response is validated against the same contract the browser validates
 * with, so the two cannot drift.
 */
export const healthRoute: RouteHandler = ({ env }) => {
  const body = HealthResponse.parse({
    status: 'ok',
    ...publicEnvSummary(env),
    time: new Date().toISOString(),
  });

  return json(body, { cacheSeconds: 5 });
};
