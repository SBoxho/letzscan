import { useQuery } from '@tanstack/react-query';
import { HealthResponse } from '@letzscan/contracts';
import { PageHeader, Placeholder } from '../../components/PageHeader';
import { apiUrl, fetchContract } from '../../lib/data-client';

/**
 * The first real wiring in the app: web -> edge API -> canonical contract.
 *
 * A dead upstream must be visible here and invisible as a crash, so the failure
 * case is rendered rather than thrown away.
 */
export function StatusPage() {
  const health = useQuery({
    queryKey: ['edge', 'health'],
    queryFn: () => fetchContract(apiUrl('/api/health'), HealthResponse),
  });

  return (
    <PageHeader title="Status" question="Is LëtzScan current, and which feeds are failing?">
      <div className="space-y-4">
        <section>
          <h2 className="font-medium">Edge API</h2>
          {health.isPending ? <p className="text-sm">Checking…</p> : null}
          {health.isError ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Unreachable. Start it locally with <code>npm run dev:edge</code>. ({' '}
              {health.error instanceof Error ? health.error.name : 'error'} )
            </p>
          ) : null}
          {health.data ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 text-sm">
              <dt className="font-medium">Status</dt>
              <dd>{health.data.status}</dd>
              <dt className="font-medium">Environment</dt>
              <dd>{health.data.environment}</dd>
              <dt className="font-medium">Version</dt>
              <dd>{health.data.version}</dd>
              <dt className="font-medium">Server time</dt>
              <dd>{health.data.time}</dd>
            </dl>
          ) : null}
        </section>

        <Placeholder>
          Connector and publication health will be generated from the same run manifests the
          pipeline writes, so this page cannot drift from reality.
        </Placeholder>
      </div>
    </PageHeader>
  );
}
