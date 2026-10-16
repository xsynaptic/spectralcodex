import type { MapSourceItem } from '@spectralcodex/map-codec';

import { selectMapRows } from '@spectralcodex/map-codec';

import type { MapFilter } from '#store/store-factory.ts';
import type { MapFeaturesRule } from '#types.ts';

export interface MapCanvasData {
	filteredCount: number;
	pointCollection: MapRowCollection;
	totalCount: number;
}

export type MapRowCollection = ReturnType<typeof toFeatureCollection>;

export interface MapFilterState extends MapFilter {
	pinnedIds?: ReadonlyArray<string>;
}

export function getMapCanvasData(
	items: ReadonlyArray<MapSourceItem>,
	filter: MapFilterState,
	scopeRule?: MapFeaturesRule,
): MapCanvasData {
	const scopeItems = scopeRule ? selectMapRows(items, scopeRule) : items;
	const points = scopeItems.filter((item) => isLocationVisible(item.properties, filter));

	return {
		filteredCount: points.length,
		pointCollection: toFeatureCollection(points),
		totalCount: scopeItems.length,
	};
}

function isLocationVisible(
	properties: MapSourceItem['properties'],
	filter: MapFilterState,
): boolean {
	if (filter.pinnedIds?.includes(properties.id)) return true;
	if (filter.status.includes(properties.status)) return false;
	if (properties.rating < filter.rating) return false;
	return properties.objective === undefined || properties.objective >= filter.objective;
}

export function getHiddenTargetIds(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
	filter: MapFilterState,
): Array<string> {
	if (targetIds.length === 0) return [];

	return selectMapRows(items, { ids: [...targetIds], type: 'ids' })
		.filter(({ properties }) => !isLocationVisible(properties, filter))
		.map(({ properties }) => properties.id);
}

function toFeatureCollection(items: Array<MapSourceItem>) {
	return { features: items, type: 'FeatureCollection' as const };
}
