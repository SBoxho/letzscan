import { Suspense, lazy } from 'react';
import { useSearch } from '@tanstack/react-router';
import { PageHeader, Placeholder } from '../../components/PageHeader';

// The map engine is a lazy boundary on purpose: it must not be downloaded by a
// visitor who never opens Explore.
const MapCanvas = lazy(() => import('../../maps/MapCanvas'));

export function ExplorePage() {
  const { indicator, geo } = useSearch({ from: '/explore' });

  return (
    <PageHeader title="Explore" question="Where in Luxembourg is a measure highest or lowest?">
      <div className="space-y-4">
        <Placeholder>
          No layer is published yet. Indicator{indicator ? ` = ${indicator}` : ' and'} geography
          {geo ? ` = ${geo}` : ''} are URL state, so any view can be shared and restored exactly.
        </Placeholder>
        <Suspense
          fallback={
            <div className="h-[420px] w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          }
        >
          <MapCanvas />
        </Suspense>
      </div>
    </PageHeader>
  );
}
