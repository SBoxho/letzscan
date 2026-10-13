import { Suspense, lazy } from 'react';
import { useSearch } from '@tanstack/react-router';
import { PageHeader, Placeholder } from '../../components/PageHeader';
import { useBasemap } from '../../maps/basemap-data';

// The map engine is a lazy boundary on purpose: it must not be downloaded by a
// visitor who never opens Explore.
const MapCanvas = lazy(() => import('../../maps/MapCanvas'));

const MAP_SKELETON = (
  <div className="h-[420px] w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
);

export function ExplorePage() {
  const { indicator, geo } = useSearch({ from: '/explore' });
  const basemap = useBasemap();

  return (
    <PageHeader title="Explore" question="Where in Luxembourg is a measure highest or lowest?">
      <div className="space-y-4">
        <Placeholder>
          No layer is published yet. Indicator{indicator ? ` = ${indicator}` : ' and'} geography
          {geo ? ` = ${geo}` : ''} are URL state, so any view can be shared and restored exactly.
        </Placeholder>
        {basemap.isError && (
          <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
            The basemap could not be loaded, so the map shows a plain background.
          </p>
        )}
        {basemap.isPending ? (
          MAP_SKELETON
        ) : (
          <Suspense fallback={MAP_SKELETON}>
            <MapCanvas basemap={basemap.data ?? null} />
          </Suspense>
        )}
      </div>
    </PageHeader>
  );
}
