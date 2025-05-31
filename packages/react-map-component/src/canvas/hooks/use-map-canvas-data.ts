import { GeometryTypeEnum } from '@spectralcodex/map-types';
import { useMemo } from 'react';

import type { MapGeometry, MapSourceFeatureCollection, MapSourceItem } from '../../types';

import {
	useMapObjectiveFilter,
	useMapQualityFilter,
	useMapRatingFilter,
	useMapSourceData,
	useMapStatusFilter,
} from '../../store/hooks/use-map-store';

// Reconstitute a valid GeoJSON object at the point of use
function getGeojsonData(sourceItems: Array<MapSourceItem>) {
	return sourceItems.length > 0
		? ({
				type: 'FeatureCollection' as const,
				features: sourceItems.map(({ geometry, ...item }) => ({
					type: 'Feature' as const,
					...item,
					geometry: geometry as MapGeometry,
				})),
			} satisfies MapSourceFeatureCollection)
		: undefined;
}

export function useMapCanvasData() {
	const sourceData = useMapSourceData();
	const statusFilter = useMapStatusFilter();
	const qualityFilter = useMapQualityFilter();
	const ratingFilter = useMapRatingFilter();
	const objectiveFilter = useMapObjectiveFilter();

	const filteredData = useMemo(
		() =>
			sourceData.filter((item) => {
				const { status, quality, rating, objective } = item.properties;

				if (statusFilter.includes(status)) return false;
				if (quality < qualityFilter) return false;
				if (rating < ratingFilter) return false;
				if (objective && objective < objectiveFilter) return false;
				return true;
			}),
		[sourceData, statusFilter, qualityFilter, ratingFilter, objectiveFilter],
	);

	return {
		filteredCount: filteredData.length,
		pointCollection: useMemo(
			() =>
				getGeojsonData(
					filteredData.filter((item) => item.geometry.type === GeometryTypeEnum.Point),
				),
			[filteredData],
		),
		lineStringCollection: useMemo(
			() =>
				getGeojsonData(
					filteredData.filter((item) => item.geometry.type === GeometryTypeEnum.LineString),
				),
			[filteredData],
		),
	};
}
