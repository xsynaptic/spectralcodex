import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LocationStatus } from '@spectralcodex/shared/map';

import { createRuleTest, selectMapRows } from '@spectralcodex/map-codec';
import { locationStatusOrder, LocationStatusRecords } from '@spectralcodex/shared/map';

import type { MapFeaturesRule } from '#types.ts';

export interface MapFilter {
	objective: number;
	rating: number;
	status: ReadonlyArray<LocationStatus>;
}

export interface MapFilterStatusOption {
	status: LocationStatus;
	title: string;
	titleZh: string;
}

export const mapFilterStatusOptions: ReadonlyArray<MapFilterStatusOption> = locationStatusOrder.map(
	(status) => {
		const { title, title_zh: titleZh } = LocationStatusRecords[status];

		return { status, title, titleZh };
	},
);

export const defaultMapFilter: MapFilter = { objective: 1, rating: 1, status: [] };

export function hasActiveFilter(filter: MapFilter) {
	return filter.status.length > 0 || filter.rating > 1 || filter.objective > 1;
}

export interface MapCanvasData {
	filteredCount: number;
	pointCollection: MapRowCollection;
	totalCount: number;
}

export type MapRowCollection = ReturnType<typeof toFeatureCollection>;

interface HiddenTargetQuery {
	scopeRule?: MapFeaturesRule | undefined;
	targetIds: ReadonlyArray<string>;
}

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
		pointCollection: toFeatureCollection([
			...points,
			...selectPinnedOutsideScope(items, filter.pinnedIds, scopeRule),
		]),
		totalCount: scopeItems.length,
	};
}

function selectPinnedOutsideScope(
	items: ReadonlyArray<MapSourceItem>,
	pinnedIds: ReadonlyArray<string> | undefined,
	scopeRule: MapFeaturesRule | undefined,
) {
	if (!scopeRule || !pinnedIds?.length) return [];

	const isInScope = createRuleTest(scopeRule);

	return selectMapRows(items, { ids: [...pinnedIds], type: 'ids' }).filter(
		({ properties }) => !isInScope(properties),
	);
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

// A Target is the subject of its page, so neither a Map Filter nor the Scope hides it; these are the ones to pin
export function getHiddenTargetIds(
	items: ReadonlyArray<MapSourceItem>,
	filter: MapFilterState,
	{ scopeRule, targetIds }: HiddenTargetQuery,
): Array<string> {
	if (targetIds.length === 0) return [];

	const isInScope = scopeRule ? createRuleTest(scopeRule) : () => true;

	return selectMapRows(items, { ids: [...targetIds], type: 'ids' })
		.filter(({ properties }) => !isInScope(properties) || !isLocationVisible(properties, filter))
		.map(({ properties }) => properties.id);
}

function toFeatureCollection(items: Array<MapSourceItem>) {
	return { features: items, type: 'FeatureCollection' as const };
}
