import { z } from 'zod';

/**
 * The only place the app reads build-time configuration.
 *
 * Everything here ships to the browser. ESLint forbids `import.meta.env`
 * elsewhere in `src/` so that this file stays the complete, auditable list of
 * what is public. Secrets are a Worker concern — see apps/edge.
 */
const EnvSchema = z.object({
  VITE_ENVIRONMENT: z.enum(['local', 'staging', 'production']).default('local'),
  /** Base URL for published static artifacts. */
  VITE_DATA_BASE_URL: z.string().min(1).default('/data'),
  /** Base URL for the edge API. Empty means same origin. */
  VITE_API_BASE_URL: z.string().default(''),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Invalid web configuration:\n${z.prettifyError(parsed.error)}`);
}

export const env = {
  environment: parsed.data.VITE_ENVIRONMENT,
  dataBaseUrl: parsed.data.VITE_DATA_BASE_URL.replace(/\/$/, ''),
  apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/$/, ''),
} as const;

export type Environment = (typeof env)['environment'];
