import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ContractViolationError, HttpError, apiUrl, dataUrl, fetchContract } from './data-client';

const Payload = z.object({ id: z.string(), value: z.number() });

function mockResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('url helpers', () => {
  it('builds artifact and API urls without doubling slashes', () => {
    expect(dataUrl('/releases/latest.json')).toBe('/data/releases/latest.json');
    expect(apiUrl('health')).toMatch(/\/health$/);
  });
});

describe('fetchContract', () => {
  it('returns parsed data when the payload matches the contract', async () => {
    mockResponse({ id: 'a', value: 1 });
    await expect(fetchContract('/x', Payload)).resolves.toEqual({ id: 'a', value: 1 });
  });

  it('fails loudly when an upstream shape changes', async () => {
    mockResponse({ id: 'a', value: 'one' });
    await expect(fetchContract('/x', Payload)).rejects.toBeInstanceOf(ContractViolationError);
  });

  it('reports the HTTP status rather than parsing an error body', async () => {
    mockResponse({ error: 'nope' }, 503);
    await expect(fetchContract('/x', Payload)).rejects.toBeInstanceOf(HttpError);
  });
});
