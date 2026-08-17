import { describe, expect, it } from 'vitest';
import { CANONICAL_SCHEMAS } from './registry.js';
import { LiveFeature } from './live-feature.js';
import { Observation } from './observation.js';
import { Period } from './common.js';
import { Source } from './source.js';

describe('canonical registry', () => {
  it('exposes every entity the architecture defines', () => {
    expect(Object.keys(CANONICAL_SCHEMAS).sort()).toEqual([
      'dataset',
      'geography',
      'geography-set',
      'indicator',
      'live-feature',
      'observation',
      'release',
      'source',
    ]);
  });
});

describe('Period', () => {
  it.each(['2025', '2025-03', '2025-03-04', '2025-Q1', '2025-W07', '2025-03-04T09:00:00Z'])(
    'accepts %s',
    (value) => {
      expect(Period.safeParse(value).success).toBe(true);
    },
  );

  it('accepts an interval', () => {
    expect(Period.safeParse('2020/2025').success).toBe(true);
  });

  it.each(['04/03/2025', '2025-13', '2025-Q5', 'last year', '2025-03-04T09:00:00'])(
    'rejects %s',
    (value) => {
      expect(Period.safeParse(value).success).toBe(false);
    },
  );
});

describe('Observation', () => {
  const base = {
    indicator_id: 'population.total',
    geo_id: 'lu.commune.0304',
    period: '2025',
    value: 1234,
    unit: 'person',
    status: 'observed',
    dataset_id: 'statec.population-by-commune',
    source_id: 'statec-lustat',
  };

  it('accepts a national observation with a null geography', () => {
    expect(Observation.safeParse({ ...base, geo_id: null }).success).toBe(true);
  });

  it('refuses to coerce a suppressed value to a number', () => {
    const result = Observation.safeParse({ ...base, status: 'suppressed', value: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts a suppressed observation with a null value', () => {
    expect(Observation.safeParse({ ...base, status: 'suppressed', value: null }).success).toBe(
      true,
    );
  });

  it('rejects an unknown status rather than passing it through', () => {
    expect(Observation.safeParse({ ...base, status: 'probably-fine' }).success).toBe(false);
  });
});

describe('LiveFeature', () => {
  const base = {
    id: 'incident-1',
    feed_id: 'example.incidents',
    source_id: 'example-source',
    kind: 'incident',
    geometry: { type: 'Point', coordinates: [6.13, 49.61] },
    observed_at: '2026-08-17T08:00:00Z',
    fetched_at: '2026-08-17T08:01:00Z',
  };

  it('requires observed_at and fetched_at to be separately stated', () => {
    expect(LiveFeature.safeParse(base).success).toBe(true);
    const { observed_at: _observed, ...withoutObserved } = base;
    expect(LiveFeature.safeParse(withoutObserved).success).toBe(false);
  });

  it('allows a missing geometry but not an invented one', () => {
    expect(LiveFeature.safeParse({ ...base, geometry: null }).success).toBe(true);
    expect(LiveFeature.safeParse({ ...base, geometry: { type: 'Blob' } }).success).toBe(false);
  });

  it('rejects a timestamp without an offset', () => {
    expect(LiveFeature.safeParse({ ...base, fetched_at: '2026-08-17T08:01:00' }).success).toBe(
      false,
    );
  });
});

describe('Source', () => {
  const base = {
    id: 'example-source',
    title: 'Example source',
    producer: 'Example producer',
    canonical_url: 'https://example.org/dataset',
    access: 'open',
    licence: { spdx: 'CC0-1.0', attribution: 'Example producer' },
    terms_checked_at: '2026-08-17',
    cadence: 'annual',
    connector: 'example-local',
  };

  it('defaults a new source to draft so nothing publishes by accident', () => {
    const parsed = Source.parse(base);
    expect(parsed.status).toBe('draft');
    expect(parsed.quality_rules).toEqual([]);
  });

  it('requires attribution even for public-domain licences', () => {
    const result = Source.safeParse({ ...base, licence: { spdx: 'CC0-1.0' } });
    expect(result.success).toBe(false);
  });

  it('requires the date the terms were last read', () => {
    const { terms_checked_at: _checked, ...withoutTerms } = base;
    expect(Source.safeParse(withoutTerms).success).toBe(false);
  });
});
