import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

import type { MapCanvasData } from '#canvas/canvas-data-filter.ts';

import { getMapCanvasData } from '#canvas/canvas-data-filter.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import {
	useMapObjectiveFilter,
	useMapEntryQualityFilter,
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

	const canvasData = useMemo(
		() =>
			getMapCanvasData(
				sourceData ?? emptyItems,
				{ status, entryQuality, rating, objective },
				mapScope,
			),
		[sourceData, status, entryQuality, rating, objective, mapScope],
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
