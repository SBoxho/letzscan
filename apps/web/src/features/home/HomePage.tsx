import { Link } from '@tanstack/react-router';
import { PageHeader, Placeholder } from '../../components/PageHeader';

const SURFACES = [
  { to: '/now', label: 'Now', question: 'What is happening right now?' },
  { to: '/places', label: 'Places', question: 'What is true about my commune?' },
  { to: '/explore', label: 'Explore', question: 'Where is this highest or lowest?' },
  { to: '/compare', label: 'Compare', question: 'How does my commune compare?' },
  { to: '/data', label: 'Data', question: 'Where does this number come from?' },
  { to: '/status', label: 'Status', question: 'Is the data current?' },
] as const;

export function HomePage() {
  return (
    <PageHeader
      title="LëtzScan"
      question="Luxembourg public data: current conditions, places, comparisons and sources."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {SURFACES.map((surface) => (
          <li
            key={surface.to}
            className="rounded border border-slate-200 p-4 dark:border-slate-800"
          >
            <Link to={surface.to} className="font-medium underline">
              {surface.label}
            </Link>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{surface.question}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Placeholder>
          Rebuild in progress. No dataset has been migrated yet — the first vertical slice is
          population by commune feeding a place profile.
        </Placeholder>
      </div>
    </PageHeader>
  );
}
