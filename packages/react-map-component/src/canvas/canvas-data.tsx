import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

import type { MapCanvasData } from '#canvas/canvas-data-filter.ts';

import { getHiddenTargetIds, getMapCanvasData } from '#canvas/canvas-data-filter.ts';
import { useMapTargetIds } from '#canvas/canvas-target-ids.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import {
	useMapEntryQualityFilter,
	useMapObjectiveFilter,
	useMapRatingFilter,
	useMapScope,
	useMapStatusFilter,
} from '#store/store.ts';

const emptyItems = [] as const;

const CanvasDataContext = createContext<MapCanvasData | undefined>(undefined);

// Computed once and shared via context; multiple consumers would otherwise repeat the full filter pass
export const CanvasDataProvider: FC<PropsWithChildren> = function CanvasDataProvider({ children }) {
	const { data: sourceData } = useSourceDataQuery();

	const status = useMapStatusFilter();
	const entryQuality = useMapEntryQualityFilter();
	const rating = useMapRatingFilter();
	const objective = useMapObjectiveFilter();
	const mapScope = useMapScope();
	const targetIds = useMapTargetIds();

	const filter = useMemo(
		() => ({ entryQuality, objective, rating, status }),
		[entryQuality, objective, rating, status],
	);

	// A string, so a new Target the filter does not hide leaves the collections and their clusters untouched
	const pinnedKey = useMemo(
		() => getHiddenTargetIds(sourceData ?? emptyItems, targetIds, filter).join(' '),
		[sourceData, targetIds, filter],
	);

	const canvasData = useMemo(
		() =>
			getMapCanvasData(
				sourceData ?? emptyItems,
				pinnedKey ? { ...filter, pinnedIds: pinnedKey.split(' ') } : filter,
				mapScope,
			),
		[sourceData, filter, mapScope, pinnedKey],
	);

	return <CanvasDataContext.Provider value={canvasData}>{children}</CanvasDataContext.Provider>;
};

export function useMapCanvasData() {
	const context = useContext(CanvasDataContext);

	if (!context) {
		throw new Error('[Map] Canvas data used outside its provider');
	}

	return context;
}
