import type { ApiErrorResponse } from '@letzscan/contracts';

/**
 * Response helpers.
 *
 * Every LëtzScan API response is public, read-only and cacheable, so CORS is
 * open for safe methods only. There is deliberately no general-purpose proxy
 * route and no credentialed CORS: nothing here is user-specific.
 */

const BASE_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'accept, content-type',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

export interface JsonOptions {
  status?: number;
  /** Seconds. Chosen per source cadence, never a blanket default. */
  cacheSeconds?: number;
  headers?: Record<string, string>;
}

export function json(body: unknown, options: JsonOptions = {}): Response {
  const { status = 200, cacheSeconds, headers } = options;
  const cacheControl =
    cacheSeconds === undefined
      ? 'no-store'
      : `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}, stale-if-error=86400`;

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'cache-control': cacheControl, ...headers },
  });
}

export function errorResponse(
  code: ApiErrorResponse['error']['code'],
  message: string,
  status: number,
): Response {
  return json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: BASE_HEADERS });
}
