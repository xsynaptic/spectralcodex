import type { LocationStatus } from '@spectralcodex/shared/map';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import type { MapGeometry, MapSourceFeatureCollection, MapSourceItemParsed } from '../types';

export interface MapFilterState {
	status: ReadonlyArray<LocationStatus>;
	quality: number;
	rating: number;
	objective: number;
}

export interface MapCanvasData {
	pointCollection: MapSourceFeatureCollection | undefined;
	lineStringCollection: MapSourceFeatureCollection | undefined;
	polygonCollection: MapSourceFeatureCollection | undefined;
	filteredCount: number;
	totalCount: number;
}

export function isLocationVisible(
	properties: MapSourceItemParsed['properties'],
	filter: MapFilterState,
): boolean {
	if (filter.status.includes(properties.status)) return false;
	if (properties.quality < filter.quality) return false;
	if (properties.rating < filter.rating) return false;
	if (properties.objective !== undefined && properties.objective < filter.objective) return false;
	return true;
}

function toFeatureCollection(
	items: Array<MapSourceItemParsed>,
): MapSourceFeatureCollection | undefined {
	if (items.length === 0) return undefined;

	return {
		type: 'FeatureCollection',
		features: items.map(({ geometry, properties }) => ({
			type: 'Feature',
			properties,
			geometry: geometry as MapGeometry,
		})),
	};
}

export function getMapCanvasData(
	items: ReadonlyArray<MapSourceItemParsed>,
	filter: MapFilterState,
): MapCanvasData {
	const points: Array<MapSourceItemParsed> = [];
	const lineStrings: Array<MapSourceItemParsed> = [];
	const polygons: Array<MapSourceItemParsed> = [];

	for (const item of items) {
		if (!isLocationVisible(item.properties, filter)) continue;

		switch (item.geometry.type) {
			case GeometryTypeEnum.Point: {
				points.push(item);
				break;
			}
			case GeometryTypeEnum.LineString: {
				lineStrings.push(item);
				break;
			}
			case GeometryTypeEnum.Polygon: {
				polygons.push(item);
				break;
			}
		}
	}

	return {
		pointCollection: toFeatureCollection(points),
		lineStringCollection: toFeatureCollection(lineStrings),
		polygonCollection: toFeatureCollection(polygons),
		// Polygons are not rendered yet; count only what is drawn
		filteredCount: points.length + lineStrings.length,
		totalCount: items.length,
	};
}
