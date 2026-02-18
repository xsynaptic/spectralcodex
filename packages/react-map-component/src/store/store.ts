import { useContext } from 'react';
import { useStore } from 'zustand';

import type { MapDataStore } from './store-provider';

import { MapStoreContext } from './store-provider';

const useMapDataStore = <T>(selector: (state: MapDataStore) => T): T => {
	const store = useContext(MapStoreContext);

	if (!store) throw new Error('Missing MapStoreContext.Provider!');

	return useStore(store, selector);
};

/**
 * Feature state
 */
export const useMapSelectedId = () => useMapDataStore((state) => state.selectedId);

export const useMapHoveredId = () => useMapDataStore((state) => state.hoveredId);

/**
 * Map canvas state
 */
export const useMapCanvasCursor = () => useMapDataStore((state) => state.canvasCursor);

export const useMapCanvasInteractive = () => useMapDataStore((state) => state.canvasInteractive);

export const useMapCanvasLoading = () => useMapDataStore((state) => state.canvasLoading);

/**
 * Map filters
 */
export const useMapFilterOpen = () => useMapDataStore((state) => state.filterOpen);

export const useMapFilterPosition = () => useMapDataStore((state) => state.filterPosition);

export const useMapStatusFilter = () => useMapDataStore((state) => state.statusFilter);

export const useMapQualityFilter = () => useMapDataStore((state) => state.qualityFilter);

export const useMapRatingFilter = () => useMapDataStore((state) => state.ratingFilter);

export const useMapObjectiveFilter = () => useMapDataStore((state) => state.objectiveFilter);

export const useMapShowObjectiveFilter = () =>
	useMapDataStore((state) => state.showObjectiveFilter);

/**
 * Map language settings
 */
export const useMapLanguages = () => useMapDataStore((state) => state.languages);

export const useMapChineseLabels = () =>
	useMapDataStore((state) => state.languages.some((lang) => lang.startsWith('zh')));

/**
 * Map actions
 */
export const useMapStoreActions = () => useMapDataStore((state) => state.actions);
