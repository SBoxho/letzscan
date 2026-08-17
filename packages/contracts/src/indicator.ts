import { z } from 'zod';
import { StableId } from './common.js';

/**
 * A stable, defined measure. `population.total` means the same thing in every
 * chart, table, map and download, or it is a different indicator.
 */
export const Indicator = z
  .object({
    id: StableId,
    name: z.string().min(1),
    /** Precise enough that two people compute the same number from it. */
    definition: z.string().min(1),
    /** Native unit, e.g. `person`, `EUR/m2`, `ug/m3`, `percent`. */
    unit: z.string().min(1),
    value_type: z.enum(['count', 'amount', 'rate', 'ratio', 'index', 'category']),
    /** How values may be combined across geographies. `none` forbids aggregation. */
    aggregation: z.enum(['sum', 'mean', 'median', 'none']),
    /** Set when the indicator is a rate or ratio computed against another indicator. */
    denominator_indicator_id: StableId.optional(),
    decimals: z.number().int().min(0).max(6).optional(),
    notes: z.string().optional(),
  })
  .meta({
    id: 'Indicator',
    title: 'Indicator',
    description: 'A stable measure definition shared by every rendering of a value.',
  });

export type Indicator = z.infer<typeof Indicator>;
