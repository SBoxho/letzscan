import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { routeTree } from './routeTree';

async function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe('application shell', () => {
  it('renders the overview with every product surface reachable', async () => {
    await renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'LëtzScan' })).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    for (const label of ['Now', 'Places', 'Explore', 'Compare', 'Data', 'Status']) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
      expect(nav).toBeInTheDocument();
    }
  });

  it.each([
    ['/now', 'Now'],
    ['/places', 'Places'],
    ['/compare', 'Compare'],
    ['/data', 'Data'],
  ])('renders %s', async (path, heading) => {
    await renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('exposes the place id from the URL, which is where place state belongs', async () => {
    await renderAt('/places/lu.commune.0304');
    expect(await screen.findByText(/lu\.commune\.0304/)).toBeInTheDocument();
  });

  it('shows a not-found page for an unknown route', async () => {
    await renderAt('/nope');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  });
});
