/**
 * Canonical LëtzScan data contracts.
 *
 * THE RULE THIS PACKAGE EXISTS TO ENFORCE
 * ---------------------------------------
 * Provider-specific schemas are transformed at the connector boundary.
 * Product code consumes canonical LëtzScan contracts, never provider payloads.
 *
 * A React component, a Worker route or a published artifact may only speak the
 * shapes defined here. If a shape is awkward for a real dataset, change the
 * contract deliberately — do not leak the provider's field names upward.
 *
 * See docs/adr/0002-canonical-contracts-and-connector-boundary.md
 */

export * from './common.js';
export * from './source.js';
export * from './dataset.js';
export * from './indicator.js';
export * from './geography.js';
export * from './observation.js';
export * from './live-feature.js';
export * from './release.js';
export * from './registry.js';
export * from './api.js';
