import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LocationStatus } from '@spectralcodex/shared/map';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import type { MapGeometry, MapScope, MapSourceFeatureCollection } from '#types.ts';

export interface MapCanvasData {
	filteredCount: number;
	lineStringCollection: MapSourceFeatureCollection | undefined;
	pointCollection: MapSourceFeatureCollection | undefined;
	totalCount: number;
}

export interface MapFilterState {
	entryQuality: number;
	objective: number;
	rating: number;
	status: ReadonlyArray<LocationStatus>;
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
			case GeometryTypeEnum.LineString: {
				lineStrings.push(item);
				break;
			}
			case GeometryTypeEnum.Point: {
				points.push(item);
				break;
			}
			// Polygons are not rendered anywhere yet; no collection is built for them
			case GeometryTypeEnum.Polygon: {
				break;
			}
		}
	}

	return {
		// Count only what is drawn
		filteredCount: points.length + lineStrings.length,
		lineStringCollection: toFeatureCollection(lineStrings),
		pointCollection: toFeatureCollection(points),
		totalCount: scopedItems.length,
	};
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

// Restrict the shared directory to this map's rows before any visibility filtering
function getScopedItems(
	items: ReadonlyArray<MapSourceItem>,
	scope: MapScope,
): ReadonlyArray<MapSourceItem> {
	switch (scope.type) {
		case 'ids': {
			const itemById = new Map(items.map((item) => [item.properties.id, item] as const));

			return scope.ids.map((id) => itemById.get(id)).filter((item) => item !== undefined);
		}
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
	}
}

function toFeatureCollection(items: Array<MapSourceItem>): MapSourceFeatureCollection | undefined {
	if (items.length === 0) return undefined;

	return {
		features: items.map(({ geometry, properties }) => ({
			geometry: geometry as MapGeometry,
			properties,
			type: 'Feature',
		})),
		type: 'FeatureCollection',
	};
}
