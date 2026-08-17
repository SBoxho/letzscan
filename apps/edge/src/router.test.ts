import { describe, expect, it } from 'vitest';
import { Router } from './router';
import { json } from './http';
import { testEnv, testExecutionContext } from './test-support';

const ctx = testExecutionContext();
const env = testEnv();

describe('Router', () => {
  it('extracts and decodes path parameters', async () => {
    const router = new Router().get('/api/v1/places/:geoId', ({ params }) =>
      json({ geoId: params.geoId }),
    );

    const response = await router.handle(
      new Request('https://edge.letzscan.test/api/v1/places/lu.commune.0304'),
      env,
      ctx,
    );

    expect(await response.json()).toEqual({ geoId: 'lu.commune.0304' });
  });

  it('does not match a prefix of a longer path', async () => {
    const router = new Router().get('/api/v1/places', () => json({ ok: true }));
    const response = await router.handle(
      new Request('https://edge.letzscan.test/api/v1/places/extra'),
      env,
      ctx,
    );
    expect(response.status).toBe(404);
  });

  it('ignores query strings when matching', async () => {
    const router = new Router().get('/api/v1/places', ({ url }) =>
      json({ q: url.searchParams.get('q') }),
    );
    const response = await router.handle(
      new Request('https://edge.letzscan.test/api/v1/places?q=esch'),
      env,
      ctx,
    );
    expect(await response.json()).toEqual({ q: 'esch' });
  });

  it('returns headers but no body for HEAD', async () => {
    const router = new Router().get('/api/health', () => json({ status: 'ok' }));
    const response = await router.handle(
      new Request('https://edge.letzscan.test/api/health', { method: 'HEAD' }),
      env,
      ctx,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
});
