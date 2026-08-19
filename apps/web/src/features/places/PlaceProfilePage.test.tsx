import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '../../app/routeTree';

/**
 * These render against the artifacts actually committed under
 * `apps/web/public/data`, not against hand-written doubles. A figure asserted
 * here is a real STATEC figure, so if the snapshot is re-published with
 * different numbers this test tells us rather than silently agreeing.
 */

// Vitest runs with the workspace as its root, and `import.meta.url` is not a
// file: URL here.
const DATA_ROOT = join(process.cwd(), 'public', 'data');

function readArtifact(path: string): string | null {
  try {
    return readFileSync(join(DATA_ROOT, path), 'utf-8');
  } catch (error) {
    // A genuinely absent artifact is a 404 to model; anything else (a bad root,
    // a permission problem) must not masquerade as one.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Serves the committed snapshot; `overrides` replace one path's body. */
function serveSnapshot(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const path = url.replace(/^\/data\//, '');

      if (path in overrides) {
        return new Response(JSON.stringify(overrides[path]), { status: 200 });
      }
      const body = readArtifact(path);
      return body === null
        ? new Response('not found', { status: 404 })
        : new Response(body, { status: 200 });
    }),
  );
}

function releaseId(): string {
  const latest = readArtifact('latest.json');
  if (latest === null) throw new Error('No committed snapshot: run `npm run data:snapshot`.');
  return (JSON.parse(latest) as { id: string }).id;
}

async function renderPlace(geoId: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/places/${geoId}`] }),
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => serveSnapshot());
afterEach(() => vi.unstubAllGlobals());

describe('/places/:geoId', () => {
  it('shows a real published figure with its source, licence and period', async () => {
    await renderPlace('lu.commune.0304');

    // Luxembourg City on 1 January 2026, as published by STATEC in DF_X021.
    expect(await screen.findByText('137,678')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Luxembourg' })).toBeInTheDocument();

    // Provenance travels with the value, and comes from catalog/ as data.
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CC0-1.0' })).toBeInTheDocument();
    expect(screen.getByText('Source: STATEC (LUSTAT)')).toBeInTheDocument();
    expect(screen.getByText('2026-08-19')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /STATEC LUSTAT statistical database/ }),
    ).toBeInTheDocument();
  });

  it('resolves a commune created by the 2023 mergers', async () => {
    await renderPlace('lu.commune.0711');

    expect(await screen.findByText('2,390')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Groussbus-Wal' })).toBeInTheDocument();
  });

  it('distinguishes an unknown place from a place with no data', async () => {
    await renderPlace('lu.commune.9999');

    expect(await screen.findByText('Unknown place')).toBeInTheDocument();
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
    expect(screen.queryByText('This data could not be loaded')).not.toBeInTheDocument();
  });

  it('says "no data" for a known commune this release does not cover', async () => {
    const id = releaseId();
    const latest = JSON.parse(readArtifact('latest.json')!) as {
      outputs: { path: string }[];
    };
    // Same release, minus one place file: the commune is real, the data is not here.
    serveSnapshot({
      'latest.json': {
        ...latest,
        outputs: latest.outputs.filter((o) => o.path !== 'places/lu.commune.0304.json'),
      },
    });

    await renderPlace('lu.commune.0304');

    expect(await screen.findByText('No data yet')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(id))).toBeInTheDocument();
    expect(screen.queryByText('Unknown place')).not.toBeInTheDocument();
  });

  it('renders a withheld value as an absence and never as zero', async () => {
    const id = releaseId();
    const observations = JSON.parse(readArtifact(`${id}/places/lu.commune.0304.json`)!) as Record<
      string,
      unknown
    >[];
    const suppressed = observations.map((o) => ({ ...o, value: null, status: 'suppressed' }));

    serveSnapshot({ [`${id}/places/lu.commune.0304.json`]: suppressed });
    await renderPlace('lu.commune.0304');

    expect(await screen.findByText('Value withheld')).toBeInTheDocument();
    expect(screen.getByText(/not zero/)).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('137,678')).not.toBeInTheDocument();
  });

  it('distinguishes a missing figure from a withheld one', async () => {
    const id = releaseId();
    const observations = JSON.parse(readArtifact(`${id}/places/lu.commune.0304.json`)!) as Record<
      string,
      unknown
    >[];
    const missing = observations.map((o) => ({ ...o, value: null, status: 'missing' }));

    serveSnapshot({ [`${id}/places/lu.commune.0304.json`]: missing });
    await renderPlace('lu.commune.0304');

    expect(await screen.findByText('No figure published')).toBeInTheDocument();
    expect(screen.queryByText('Value withheld')).not.toBeInTheDocument();
  });

  it('reports an unreadable artifact as a service problem, not as a fact', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('upstream down', { status: 503 })),
    );
    await renderPlace('lu.commune.0304');

    // usePlaceProfile retries a non-404 once before giving up, so the failed
    // state legitimately takes longer than the default 1s to settle.
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent('This data could not be loaded');
    expect(alert).toHaveTextContent('HTTP 503');
    // Crucially, it must not read as "this commune has no population".
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown place')).not.toBeInTheDocument();
  });

  it('fails loudly when an artifact does not match its contract', async () => {
    serveSnapshot({ 'latest.json': { id: 'broken', nope: true } });
    await renderPlace('lu.commune.0304');

    // usePlaceProfile retries a non-404 once before giving up, so the failed
    // state legitimately takes longer than the default 1s to settle.
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent('did not match its LëtzScan contract');
  });
});
