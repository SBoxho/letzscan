import { create } from 'zustand';

/**
 * Transient client state only.
 *
 * WHAT BELONGS HERE
 *   Ephemeral interaction that dies with the tab: hover, selection, whether a
 *   control is open, imperative commands between map and panel.
 *
 * WHAT DOES NOT
 *   - Anything fetched over the network. That is TanStack Query's job; caching
 *     remote data in a store is how freshness and retry logic get reinvented.
 *   - Anything a shared link must reproduce. That is URL state, owned by
 *     TanStack Router. If a user would expect to send it to a colleague, it is
 *     a search parameter, not a store field.
 *
 * See docs/adr/0003-frontend-state-ownership.md
 */
interface MapState {
  hoveredFeatureId: string | null;
  selectedFeatureId: string | null;
  isLegendOpen: boolean;

  setHoveredFeature: (id: string | null) => void;
  setSelectedFeature: (id: string | null) => void;
  toggleLegend: () => void;
  reset: () => void;
}

const INITIAL = {
  hoveredFeatureId: null,
  selectedFeatureId: null,
  isLegendOpen: true,
} satisfies Pick<MapState, 'hoveredFeatureId' | 'selectedFeatureId' | 'isLegendOpen'>;

export const useMapStore = create<MapState>((set) => ({
  ...INITIAL,
  setHoveredFeature: (hoveredFeatureId) => set({ hoveredFeatureId }),
  setSelectedFeature: (selectedFeatureId) => set({ selectedFeatureId }),
  toggleLegend: () => set((state) => ({ isLegendOpen: !state.isLegendOpen })),
  reset: () => set(INITIAL),
}));
