import { describe, expect, it } from 'vitest';
import { HealthResponse } from '@letzscan/contracts';
import worker, { router } from './index';
import { SECRET_BINDINGS } from './env';
import { testEnv, testExecutionContext } from './test-support';

const ctx = testExecutionContext();

async function get(path: string, env = testEnv()) {
  return router.handle(new Request(`https://edge.letzscan.test${path}`), env, ctx);
}

describe('GET /api/health', () => {
  it('returns a payload that satisfies the published contract', async () => {
    const response = await get('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body: unknown = await response.json();
    expect(HealthResponse.safeParse(body).success).toBe(true);
  });

  it('is readable cross-origin, because every response is public data', async () => {
    const response = await get('/api/health');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('never leaks a secret binding into the response', async () => {
    // Kept short and boring on purpose: scripts/check-secrets.mjs treats a long
    // opaque literal next to a credential-shaped name as a finding, and it is
    // right to.
    const planted = 'planted-value-42';
    const response = await get('/api/health', testEnv({ MOBILITEIT_ACCESS_ID: planted }));
    const text = await response.text();

    expect(text).not.toContain(planted);
    for (const binding of SECRET_BINDINGS) {
      expect(text).not.toContain(binding);
    }
  });
});

describe('routing', () => {
  it('answers an unknown path with a contract-shaped error', async () => {
    const response = await get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'not_found', message: 'No route for /api/does-not-exist' },
    });
  });

  it('rejects unsafe methods', async () => {
    const response = await router.handle(
      new Request('https://edge.letzscan.test/api/health', { method: 'POST' }),
      testEnv(),
      ctx,
    );
    expect(response.status).toBe(405);
  });

  it('answers preflight without a body', async () => {
    const response = await router.handle(
      new Request('https://edge.letzscan.test/api/health', { method: 'OPTIONS' }),
      testEnv(),
      ctx,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
  });
});

describe('scheduled handler', () => {
  it('is registered so a cron trigger has somewhere to land', () => {
    expect(typeof worker.scheduled).toBe('function');
  });
});
