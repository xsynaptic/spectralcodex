import type { LocationStatus } from '@spectralcodex/shared/map';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import type {
	MapGeometry,
	MapScope,
	MapSourceFeatureCollection,
	MapSourceItemParsed,
} from '../types';

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
	return !(properties.objective !== undefined && properties.objective < filter.objective);
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

// Restrict the shared index to this map's rows before any visibility filtering
function isInMapScope(
	properties: MapSourceItemParsed['properties'],
	scope: MapScope,
	idSet: ReadonlySet<string> | undefined,
): boolean {
	switch (scope.type) {
		case 'region': {
			const [left, right] = scope.interval;
			return (
				properties.regionOrdinals?.some((ordinal) => ordinal >= left && ordinal <= right) ?? false
			);
		}
		case 'theme': {
			return properties.themeIndices?.includes(scope.index) ?? false;
		}
		case 'ids': {
			return idSet?.has(properties.id) ?? false;
		}
	}
}

export function getMapCanvasData(
	items: ReadonlyArray<MapSourceItemParsed>,
	filter: MapFilterState,
	scope?: MapScope,
): MapCanvasData {
	const idSet = scope?.type === 'ids' ? new Set(scope.ids) : undefined;
	let scopedItems = scope
		? items.filter((item) => isInMapScope(item.properties, scope, idSet))
		: items;

	// Id-list maps keep the scope's order; a future series LineString depends on it
	if (scope?.type === 'ids') {
		const positionById = new Map(scope.ids.map((id, index) => [id, index] as const));
		scopedItems = [...scopedItems].sort(
			(itemA, itemB) =>
				(positionById.get(itemA.properties.id) ?? 0) - (positionById.get(itemB.properties.id) ?? 0),
		);
	}

	const points: Array<MapSourceItemParsed> = [];
	const lineStrings: Array<MapSourceItemParsed> = [];
	const polygons: Array<MapSourceItemParsed> = [];

	for (const item of scopedItems) {
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
		totalCount: scopedItems.length,
	};
}
