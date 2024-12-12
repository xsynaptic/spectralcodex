import { useContext } from 'react';
import { useStore } from 'zustand';

import type { MapDataStore } from '../map-store-types';

import { MapStoreContext } from '../map-store-provider';

const useMapDataStore = <T>(selector: (state: MapDataStore) => T): T => {
	const store = useContext(MapStoreContext);

	if (!store) throw new Error('Missing MapStoreContext.Provider!');

	return useStore(store, selector);
};

/**
 * Map canvas data
 */
export const useMapSourceData = () => useMapDataStore((state) => state.sourceData);

export const useMapSourceDataLoading = () => useMapDataStore((state) => state.sourceDataLoading);

export const useMapSourceDataCount = () => useMapDataStore((state) => state.sourceDataCount);

/**
 * Map canvas
 */
export const useMapCanvasCursor = () => useMapDataStore((state) => state.canvasCursor);

export const useMapCanvasInteractive = () => useMapDataStore((state) => state.canvasInteractive);

export const useMapCanvasLoading = () => useMapDataStore((state) => state.canvasLoading);

export const useMapCanvasClusters = () => useMapDataStore((state) => state.canvasClusters);

/**
 * Map popup
 */
export const useMapPopupDataLoading = () => useMapDataStore((state) => state.popupDataLoading);

export const useMapPopupItem = () => useMapDataStore((state) => state.popupItem);

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
 * Map languages
 */
export const useMapLanguages = () => useMapDataStore((state) => state.languages);

/**
 * Map actions
 */
export const useMapStoreActions = () => useMapDataStore((state) => state.actions);
