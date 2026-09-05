import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LocationStatus } from '@spectralcodex/shared/map';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import type { MapGeometry, MapScope, MapSourceFeatureCollection } from '#types.ts';

export interface MapFilterState {
	status: ReadonlyArray<LocationStatus>;
	entryQuality: number;
	rating: number;
	objective: number;
}

export interface MapCanvasData {
	pointCollection: MapSourceFeatureCollection | undefined;
	lineStringCollection: MapSourceFeatureCollection | undefined;
	filteredCount: number;
	totalCount: number;
}

export function isLocationVisible(
	properties: MapSourceItem['properties'],
	filter: MapFilterState,
): boolean {
	if (filter.status.includes(properties.status)) return false;
	if (properties.entryQuality < filter.entryQuality) return false;
	if (properties.rating < filter.rating) return false;
	return properties.objective === undefined || properties.objective >= filter.objective;
}

function toFeatureCollection(items: Array<MapSourceItem>): MapSourceFeatureCollection | undefined {
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

// Restrict the shared directory to this map's rows before any visibility filtering
function getScopedItems(
	items: ReadonlyArray<MapSourceItem>,
	scope: MapScope,
): ReadonlyArray<MapSourceItem> {
	switch (scope.type) {
		case 'region': {
			const [left, right] = scope.interval;

			return items.filter(
				({ properties }) =>
					properties.regionOrdinals?.some((ordinal) => ordinal >= left && ordinal <= right) ??
					false,
			);
		}
		case 'theme': {
			return items.filter(
				({ properties }) => properties.themeIndices?.includes(scope.index) ?? false,
			);
		}
		case 'ids': {
			const itemById = new Map(items.map((item) => [item.properties.id, item] as const));

			return scope.ids.map((id) => itemById.get(id)).filter((item) => item !== undefined);
		}
	}
}

export function getMapCanvasData(
	items: ReadonlyArray<MapSourceItem>,
	filter: MapFilterState,
	scope?: MapScope,
): MapCanvasData {
	const scopedItems = scope ? getScopedItems(items, scope) : items;

	const points: Array<MapSourceItem> = [];
	const lineStrings: Array<MapSourceItem> = [];

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
			// Polygons are not rendered anywhere yet; no collection is built for them
			case GeometryTypeEnum.Polygon: {
				break;
			}
		}
	}

	return {
		pointCollection: toFeatureCollection(points),
		lineStringCollection: toFeatureCollection(lineStrings),
		// Count only what is drawn
		filteredCount: points.length + lineStrings.length,
		totalCount: scopedItems.length,
	};
}
