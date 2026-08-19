import type { ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import type { Dataset, Indicator, Observation, Release, Source } from '@letzscan/contracts';
import { PageHeader } from '../../components/PageHeader';
import { ContractViolationError, HttpError } from '../../lib/data-client';
import { fetchedAtFor, latestObservation, usePlaceProfile } from './place-data';

/**
 * "What is true about this commune?"
 *
 * Every number on this page carries where it came from, under what licence, for
 * which period and when it was retrieved. Nothing here is typed in: the licence,
 * the attribution, the unit and the caveats all arrive from `catalog/` as data.
 *
 * The four ways this page can fail to show a figure are deliberately different
 * from one another, because they mean different things to a reader:
 *   - the id is not a commune we publish        -> unknown place
 *   - the commune exists but this release has   -> no data
 *     no figures for it
 *   - the producer withheld the value           -> suppressed / missing
 *   - the artifact could not be read            -> service problem, not a fact
 */

const INDICATOR_ID = 'population.total';

function formatCount(value: number, decimals = 0): string {
  // Presentation locale is deliberately fixed until the i18n decision is made.
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: 'neutral' | 'warning' | 'error';
  title: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
    warning: 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950',
    error: 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950',
  } as const;

  return (
    <section
      className={`rounded border p-4 ${tones[tone]}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <h2 className="font-medium">{title}</h2>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  );
}

function Provenance({
  release,
  observation,
  source,
  dataset,
  indicator,
}: {
  release: Release;
  observation: Observation;
  source: Source | undefined;
  dataset: Dataset | undefined;
  indicator: Indicator | undefined;
}) {
  const fetchedAt = fetchedAtFor(release, observation.source_id);

  return (
    <div className="mt-6 space-y-4 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="font-medium">Period</dt>
        <dd>{observation.period}</dd>

        {indicator ? (
          <>
            <dt className="font-medium">Measure</dt>
            <dd>
              {indicator.name} ({indicator.unit})
            </dd>
          </>
        ) : null}

        {source ? (
          <>
            <dt className="font-medium">Source</dt>
            <dd>
              <a className="underline" href={source.canonical_url} rel="noreferrer noopener">
                {source.title}
              </a>
              <span className="block text-slate-600 dark:text-slate-400">{source.producer}</span>
            </dd>

            <dt className="font-medium">Licence</dt>
            <dd>
              {source.licence.url ? (
                <a className="underline" href={source.licence.url} rel="noreferrer noopener">
                  {source.licence.spdx}
                </a>
              ) : (
                source.licence.spdx
              )}
              <span className="block text-slate-600 dark:text-slate-400">
                {source.licence.attribution}
              </span>
            </dd>

            <dt className="font-medium">Terms checked</dt>
            <dd>{source.terms_checked_at}</dd>
          </>
        ) : null}

        {fetchedAt ? (
          <>
            <dt className="font-medium">Retrieved</dt>
            <dd>{fetchedAt}</dd>
          </>
        ) : null}

        <dt className="font-medium">Release</dt>
        <dd>
          {release.id}{' '}
          <span className="text-slate-600 dark:text-slate-400">({release.status})</span>
        </dd>
      </dl>

      {dataset && dataset.caveats.length > 0 ? (
        <details>
          <summary className="cursor-pointer font-medium">
            Before you compare this number ({dataset.caveats.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
            {dataset.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function PlaceProfilePage() {
  const { geoId } = useParams({ from: '/places/$geoId' });
  const profile = usePlaceProfile(geoId);

  const title = profile.data?.geography?.name ?? geoId;

  return (
    <PageHeader title={title} question="What is true about this commune?">
      {profile.isPending ? <p className="text-sm">Loading published data…</p> : null}

      {profile.isError ? (
        <Notice tone="error" title="This data could not be loaded">
          <p>
            The published artifact could not be read, so LëtzScan cannot say anything about this
            place right now. This is a problem with the service, not a statement about{' '}
            <code>{geoId}</code>.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {profile.error instanceof HttpError
              ? `HTTP ${profile.error.status} from ${profile.error.url}`
              : profile.error instanceof ContractViolationError
                ? 'The artifact did not match its LëtzScan contract.'
                : profile.error.message}
          </p>
        </Notice>
      ) : null}

      {profile.data ? <Profile geoId={geoId} profile={profile.data} /> : null}
    </PageHeader>
  );
}

function Profile({
  geoId,
  profile,
}: {
  geoId: string;
  profile: NonNullable<ReturnType<typeof usePlaceProfile>['data']>;
}) {
  const { release, geography, observations, sources, datasets, indicators } = profile;

  if (geography === null) {
    return (
      <Notice tone="neutral" title="Unknown place">
        <p>
          <code>{geoId}</code> is not a commune in the published geography set. Luxembourg has had
          100 communes since 1 September 2023, and identifiers look like{' '}
          <code>lu.commune.0304</code>.
        </p>
      </Notice>
    );
  }

  const observation = latestObservation(observations, INDICATOR_ID);

  if (observation === undefined) {
    return (
      <Notice tone="neutral" title="No data yet">
        <p>
          {geography.name} is a commune LëtzScan knows ({geography.code}), but release{' '}
          <code>{release.id}</code> publishes no population figure for it.
        </p>
      </Notice>
    );
  }

  const source = sources[observation.source_id];
  const dataset = datasets[observation.dataset_id];
  const indicator = indicators[observation.indicator_id];
  const withheld = observation.status === 'suppressed' || observation.status === 'missing';

  return (
    <div>
      {withheld ? (
        <Notice
          tone="warning"
          title={observation.status === 'suppressed' ? 'Value withheld' : 'No figure published'}
        >
          <p>
            {observation.status === 'suppressed'
              ? `The producer withheld the ${observation.period} figure for ${geography.name}, so LëtzScan has no value to show.`
              : `The producer published no ${observation.period} figure for ${geography.name}.`}{' '}
            This is <strong>not zero</strong>, and it is not an error — it is an absence, recorded
            as one.
          </p>
        </Notice>
      ) : (
        <section>
          <p className="text-4xl font-semibold tabular-nums">
            {typeof observation.value === 'number'
              ? formatCount(observation.value, indicator?.decimals ?? 0)
              : observation.value}
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {indicator?.name ?? observation.indicator_id} · {geography.name} ({geography.code}) ·{' '}
            {observation.period}
            {observation.status === 'observed' ? null : ` · ${observation.status}`}
          </p>
        </section>
      )}

      <Provenance
        release={release}
        observation={observation}
        source={source}
        dataset={dataset}
        indicator={indicator}
      />
    </div>
  );
}
