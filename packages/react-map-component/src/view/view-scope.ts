import type { MapSourceItem } from '@spectralcodex/map-codec';

import type { MapFeaturesRule, MapScope, MapView } from '#types.ts';

import { createRuleTest } from '#data/data-filter.ts';

export interface MapScopeResult {
	isScopeEnabled: boolean;
	// False until source data loads, when a Location cannot yet be tested against the Scope
	isSettled: boolean;
	scope: MapScope | undefined;
}

// A Location with no Targets, or with one the map does not hold, counts as outside the Scope
function isEveryTargetInRule(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
	rule: MapFeaturesRule,
) {
	const targetIdSet = new Set(targetIds);
	const isInRule = createRuleTest(rule);
	const targets = items.filter(({ properties }) => targetIdSet.has(properties.id));

	return (
		targetIdSet.size > 0 &&
		targets.length === targetIdSet.size &&
		targets.every(({ properties }) => isInRule(properties))
	);
}

export interface MapScopeState {
	isScopeEnabled: boolean;
	scope: MapScope | undefined;
	viewKey: string | undefined;
}

export function reduceMapScope(
	{ isScopeEnabled, scope, viewKey }: MapScopeState,
	page: { view: MapView; viewKey: string | undefined },
	items: ReadonlyArray<MapSourceItem> | undefined,
): MapScopeResult {
	// The same view is never applied twice, so a Scope the user turned off stays off on that page
	if (page.viewKey === viewKey) return { isScopeEnabled, isSettled: true, scope };

	if (page.view.scope) return { isScopeEnabled: true, isSettled: true, scope: page.view.scope };

	if (!scope || !isScopeEnabled || !page.view.targetIds) {
		return { isScopeEnabled, isSettled: true, scope };
	}

	if (!items) return { isScopeEnabled, isSettled: false, scope };

	return {
		isScopeEnabled,
		isSettled: true,
		scope: isEveryTargetInRule(items, page.view.targetIds, scope.rule) ? scope : undefined,
	};
}
