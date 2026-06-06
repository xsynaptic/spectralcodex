import { useMemo } from 'react';

import { useSourceDataQuery } from '../data/data-source';
import {
	useMapObjectiveFilter,
	useMapQualityFilter,
	useMapRatingFilter,
	useMapStatusFilter,
} from '../store/store';
import { getMapCanvasData } from './canvas-data-filter';

const EMPTY_ITEMS = [] as const;

export function useMapCanvasData() {
	const { data: sourceData } = useSourceDataQuery();

	const status = useMapStatusFilter();
	const quality = useMapQualityFilter();
	const rating = useMapRatingFilter();
	const objective = useMapObjectiveFilter();

	return useMemo(
		() => getMapCanvasData(sourceData ?? EMPTY_ITEMS, { status, quality, rating, objective }),
		[sourceData, status, quality, rating, objective],
	);
}
