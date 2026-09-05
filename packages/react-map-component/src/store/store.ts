import { useContext } from 'react';
import { useStore } from 'zustand';

import type { MapDataStore } from './store-factory.ts';

import { MapStoreContext } from './store-provider.tsx';

const useMapDataStore = <T>(selector: (state: MapDataStore) => T): T => {
	const store = useContext(MapStoreContext);

	if (!store) throw new Error('Missing MapStoreContext.Provider!');

	return useStore(store, selector);
};

// Raw store access (for reading state in callbacks without subscribing to re-renders)
export function useMapStoreInstance() {
	const store = useContext(MapStoreContext);

	if (!store) throw new Error('Missing MapStoreContext.Provider!');

	return store;
}

// Feature state
export const useMapSelectedId = () => useMapDataStore((state) => state.selectedId);

export const useIsMapPopupVisible = () => useMapDataStore((state) => state.isPopupVisible);

export const useMapHoveredId = () => useMapDataStore((state) => state.hoveredId);

// Map canvas state
export const useIsMapCanvasInteractive = () =>
	useMapDataStore((state) => state.isCanvasInteractive);

export const useIsMapCanvasLoading = () => useMapDataStore((state) => state.isCanvasLoading);

// Map filters
export const useIsMapFilterOpen = () => useMapDataStore((state) => state.isFilterOpen);

export const useMapFilterPosition = () => useMapDataStore((state) => state.filterPosition);

export const useMapStatusFilter = () => useMapDataStore((state) => state.statusFilter);

export const useMapEntryQualityFilter = () => useMapDataStore((state) => state.entryQualityFilter);

export const useMapRatingFilter = () => useMapDataStore((state) => state.ratingFilter);

export const useMapObjectiveFilter = () => useMapDataStore((state) => state.objectiveFilter);

export const useIsMapObjectiveFilterEnabled = () =>
	useMapDataStore((state) => state.isObjectiveFilterEnabled);

export const useMapScope = () => useMapDataStore((state) => state.scope);

// Map language settings
export const useMapLanguages = () => useMapDataStore((state) => state.languages);

export const useHasMapChineseLabels = () =>
	useMapDataStore((state) => state.languages.some((lang) => lang.startsWith('zh')));

// Map actions
export const useMapStoreActions = () => useMapDataStore((state) => state.actions);
