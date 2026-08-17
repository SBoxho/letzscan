import type { Env } from './env';

/**
 * Scheduled ingestion entry point.
 *
 * The shape this will take, recorded now so the first connector has somewhere
 * obvious to go:
 *
 *   1. Select the connectors whose cadence matches `controller.cron`.
 *   2. Fetch with a timeout, a size cap and bounded retries; one dead upstream
 *      never fails the batch.
 *   3. Validate the provider payload, then normalize it to LiveFeature records
 *      at the connector boundary. Provider field names stop there.
 *   4. Refuse to overwrite a good artifact with an empty one unless the source
 *      genuinely represents an empty state (zero active warnings, say).
 *   5. Write atomically to R2 and update the health manifest with
 *      last_attempt / last_success / last_change / consecutive_failures.
 *
 * No connector exists yet, so this deliberately does nothing except record that
 * it ran. A cron that silently does nothing is worse than no cron at all.
 */
export async function runScheduled(controller: ScheduledController, env: Env): Promise<void> {
  console.warn(
    JSON.stringify({
      event: 'scheduled.noop',
      cron: controller.cron,
      scheduled_at: new Date(controller.scheduledTime).toISOString(),
      environment: env.ENVIRONMENT,
      reason: 'No connectors registered yet.',
    }),
  );
  return Promise.resolve();
}
