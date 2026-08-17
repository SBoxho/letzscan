import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from './map-store';

describe('map store', () => {
  beforeEach(() => {
    useMapStore.getState().reset();
  });

  it('holds only transient interaction state', () => {
    const state = useMapStore.getState();
    const dataLikeKeys = Object.keys(state).filter((key) =>
      /observations?|dataset|indicator|release|cache|fetch/i.test(key),
    );
    expect(dataLikeKeys).toEqual([]);
  });

  it('tracks hover and selection independently', () => {
    useMapStore.getState().setHoveredFeature('a');
    useMapStore.getState().setSelectedFeature('b');
    expect(useMapStore.getState().hoveredFeatureId).toBe('a');
    expect(useMapStore.getState().selectedFeatureId).toBe('b');
  });

  it('resets to a clean slate', () => {
    useMapStore.getState().setSelectedFeature('b');
    useMapStore.getState().toggleLegend();
    useMapStore.getState().reset();
    expect(useMapStore.getState().selectedFeatureId).toBeNull();
    expect(useMapStore.getState().isLegendOpen).toBe(true);
  });
});
