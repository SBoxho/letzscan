import { Link, Outlet } from '@tanstack/react-router';
import { env } from '../lib/env';

const SURFACES = [
  { to: '/', label: 'Overview' },
  { to: '/now', label: 'Now' },
  { to: '/places', label: 'Places' },
  { to: '/explore', label: 'Explore' },
  { to: '/compare', label: 'Compare' },
  { to: '/data', label: 'Data' },
  { to: '/status', label: 'Status' },
] as const;

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:underline"
      >
        Skip to content
      </a>

      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            LëtzScan
          </Link>
          <nav aria-label="Primary">
            <ul className="flex flex-wrap gap-4 text-sm">
              {SURFACES.map((surface) => (
                <li key={surface.to}>
                  <Link
                    to={surface.to}
                    activeOptions={{ exact: surface.to === '/' }}
                    className="hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline"
                  >
                    {surface.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <span className="ml-auto rounded border border-slate-300 px-2 py-0.5 text-xs uppercase dark:border-slate-700">
            {env.environment}
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 px-4 py-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <div className="mx-auto max-w-5xl">
          Rebuild in progress. Code is Apache-2.0; upstream datasets keep their own licences — see{' '}
          <code>DATA_LICENSES.md</code>.
        </div>
      </footer>
    </div>
  );
}
