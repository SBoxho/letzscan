import type { z } from 'zod';
import { Dataset } from './dataset.js';
import { Geography, GeographySet } from './geography.js';
import { Indicator } from './indicator.js';
import { LiveFeature } from './live-feature.js';
import { Observation } from './observation.js';
import { Release } from './release.js';
import { Source } from './source.js';

/**
 * Every canonical entity, keyed by the file name it is published under in
 * `schemas/`. The JSON Schema files are generated from here so that TypeScript
 * and Python cannot drift: TypeScript validates with Zod, Python validates
 * against the emitted schema.
 */
export const CANONICAL_SCHEMAS = {
  source: Source,
  dataset: Dataset,
  indicator: Indicator,
  geography: Geography,
  'geography-set': GeographySet,
  observation: Observation,
  'live-feature': LiveFeature,
  release: Release,
} as const satisfies Record<string, z.ZodType>;

export type CanonicalSchemaName = keyof typeof CANONICAL_SCHEMAS;

/**
 * Which catalogue directory validates against which schema.
 * Used by `letzscan validate-catalog` and by CI.
 */
export const CATALOG_SCHEMA_BY_DIRECTORY = {
  sources: 'source',
  indicators: 'indicator',
  geographies: 'geography-set',
  datasets: 'dataset',
} as const satisfies Record<string, CanonicalSchemaName>;
