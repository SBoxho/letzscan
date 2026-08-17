import type { Env } from './env';
import { Router } from './router';
import { healthRoute } from './routes/health';
import { runScheduled } from './scheduled';

/**
 * LëtzScan edge Worker.
 *
 * Responsibilities:
 *   - serve a small, fixed set of normalized read-only API routes;
 *   - run scheduled live ingestion into R2;
 *   - hold every provider credential, so the browser never needs one.
 *
 * Non-responsibilities: it is not a general backend, and there is no
 * pass-through proxy route. Published statistical artifacts are static files
 * served from R2/CDN and never travel through this Worker.
 */
export const router = new Router().get('/api/health', healthRoute);

export default {
  fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },

  scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(controller, env));
  },
} satisfies ExportedHandler<Env>;
