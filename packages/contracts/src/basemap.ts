import { z } from 'zod';
import { StableId } from './common.js';

/**
 * XYZ tile URL template. HTTPS only, because a page served over HTTPS cannot
 * load mixed content, and `{z}`, `{x}` and `{y}` must all be present or the
 * template addresses a single tile. One pattern rather than a refinement, so the
 * generated JSON Schema — and therefore the Python validator — enforces it too.
 */
const TileUrlTemplate = z
  .string()
  .regex(
    /^https:\/\/(?=\S*\{z\})(?=\S*\{x\})(?=\S*\{y\})\S+$/,
    'must be an https:// URL template containing {z}, {x} and {y}',
  );

const ZoomLevel = z.int().min(0).max(24);

/**
 * A reviewed raster basemap the browser draws beneath LëtzScan's own layers.
 *
 * The browser fetches these tiles straight from the producer, so the URL must
 * need no credential: a key in a tile URL is a key in the browser. Licence,
 * attribution and `terms_checked_at` belong to the source this entry names —
 * one reviewed `catalog/sources/` file — and are never restated here.
 *
 * See docs/adr/0008-basemap.md
 */
export const Basemap = z
  .object({
    id: StableId,
    title: z.string().min(1),
    /** Reviewed source whose licence and attribution govern these tiles. */
    source_id: StableId,
    /** One or more equivalent mirrors of the same tile pyramid (Web Mercator, XYZ). */
    tiles: z.array(TileUrlTemplate).min(1),
    tile_size: z.union([z.literal(256), z.literal(512)]),
    min_zoom: ZoomLevel,
    max_zoom: ZoomLevel,
    /** `draft` basemaps are catalogued but never published to the browser. */
    status: z.enum(['draft', 'active', 'disabled']).default('draft'),
    status_reason: z.string().optional(),
    notes: z.string().optional(),
  })
  .meta({
    id: 'Basemap',
    title: 'Basemap',
    description: 'A reviewed, credential-free raster basemap drawn beneath LëtzScan layers.',
  });

export type Basemap = z.infer<typeof Basemap>;
