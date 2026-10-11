import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LocationStatus } from '@spectralcodex/shared/map';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import type { MapFeaturesRule, MapGeometry, MapSourceFeatureCollection } from '#types.ts';

export interface MapCanvasData {
	filteredCount: number;
	lineStringCollection: MapSourceFeatureCollection | undefined;
	pointCollection: MapSourceFeatureCollection | undefined;
	totalCount: number;
}

export interface MapCanvasRules {
	mapFeaturesRule?: MapFeaturesRule | undefined;
	scopeRule?: MapFeaturesRule | undefined;
}

export interface MapFilterState {
	entryQuality: number;
	objective: number;
	// Shown whatever the rest of the filter says
	pinnedIds?: ReadonlyArray<string>;
	rating: number;
	status: ReadonlyArray<LocationStatus>;
}

export function getMapCanvasData(
	items: ReadonlyArray<MapSourceItem>,
	filter: MapFilterState,
	{ mapFeaturesRule, scopeRule }: MapCanvasRules = {},
): MapCanvasData {
	const mapItems = mapFeaturesRule ? getRuleItems(items, mapFeaturesRule) : items;
	const scopeItems = scopeRule ? getRuleItems(mapItems, scopeRule) : mapItems;

	const points: Array<MapSourceItem> = [];
	const lineStrings: Array<MapSourceItem> = [];

	for (const item of scopeItems) {
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
		totalCount: scopeItems.length,
	};
}

export function isLocationVisible(
	properties: MapSourceItem['properties'],
	filter: MapFilterState,
): boolean {
	if (filter.pinnedIds?.includes(properties.id)) return true;
	if (filter.status.includes(properties.status)) return false;
	if (properties.entryQuality < filter.entryQuality) return false;
	if (properties.rating < filter.rating) return false;
	return properties.objective === undefined || properties.objective >= filter.objective;
}

// A Target is the subject of its page, so a filter never hides it; these are the ones to pin
export function getHiddenTargetIds(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
	filter: MapFilterState,
): Array<string> {
	if (targetIds.length === 0) return [];

	const targetIdSet = new Set(targetIds);

	return items
		.filter(
			({ properties }) => targetIdSet.has(properties.id) && !isLocationVisible(properties, filter),
		)
		.map(({ properties }) => properties.id);
}

export function createRuleTest(
	rule: MapFeaturesRule,
): (properties: MapSourceItem['properties']) => boolean {
	switch (rule.type) {
		case 'ids': {
			const idSet = new Set(rule.ids);

			return (properties) => idSet.has(properties.id);
		}
		case 'region': {
			const [left, right] = rule.interval;

			return (properties) =>
				properties.regionOrdinals?.some((ordinal) => ordinal >= left && ordinal <= right) ?? false;
		}
		case 'theme': {
			return (properties) => properties.themeIndices?.includes(rule.index) ?? false;
		}
	}
}

function getRuleItems(
	items: ReadonlyArray<MapSourceItem>,
	rule: MapFeaturesRule,
): ReadonlyArray<MapSourceItem> {
	// An id list also sets the order
	if (rule.type === 'ids') {
		const itemById = new Map(items.map((item) => [item.properties.id, item] as const));

		return rule.ids.map((id) => itemById.get(id)).filter((item) => item !== undefined);
	}

	const isInRule = createRuleTest(rule);

	return items.filter(({ properties }) => isInRule(properties));
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
