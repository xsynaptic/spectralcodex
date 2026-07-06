import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

import type { MapCanvasData } from './canvas-data-filter';

import { useSourceDataQuery } from '../data/data-source';
import {
	useMapObjectiveFilter,
	useMapQualityFilter,
	useMapRatingFilter,
	useMapScope,
	useMapStatusFilter,
} from '../store/store';
import { getMapCanvasData } from './canvas-data-filter';

const EMPTY_ITEMS = [] as const;

const CanvasDataContext = createContext<MapCanvasData | undefined>(undefined);

// Computed once and shared via context; multiple consumers would otherwise repeat the full filter pass
export const CanvasDataProvider: FC<PropsWithChildren> = function CanvasDataProvider({ children }) {
	const { data: sourceData } = useSourceDataQuery();

	const status = useMapStatusFilter();
	const quality = useMapQualityFilter();
	const rating = useMapRatingFilter();
	const objective = useMapObjectiveFilter();
	const mapScope = useMapScope();

	const canvasData = useMemo(
		() =>
			getMapCanvasData(sourceData ?? EMPTY_ITEMS, { status, quality, rating, objective }, mapScope),
		[sourceData, status, quality, rating, objective, mapScope],
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
