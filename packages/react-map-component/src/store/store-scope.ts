import type { MapSourceItem } from '@spectralcodex/map-codec';

import { createRuleTest, selectMapRows } from '@spectralcodex/map-codec';

import type { MapFeaturesRule, MapScope, MapStoreView } from '#types.ts';

function isEveryTargetInRule(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
	rule: MapFeaturesRule,
) {
	const isInRule = createRuleTest(rule);
	const targets = selectMapRows(items, { ids: [...targetIds], type: 'ids' });

	return (
		targetIds.length > 0 &&
		targets.length === targetIds.length &&
		targets.every(({ properties }) => isInRule(properties))
	);
}

export interface MapScopeState {
	isScopeEnabled: boolean;
	scope: MapScope | undefined;
}

export function reduceMapScope(
	{ isScopeEnabled, scope }: MapScopeState,
	page: MapStoreView,
	items: ReadonlyArray<MapSourceItem> | undefined,
): MapScopeState {
	if (page.view.scope) return { isScopeEnabled: true, scope: page.view.scope };

	if (!items || !scope || !isScopeEnabled || !page.view.targetIds) {
		return { isScopeEnabled, scope };
	}

	return {
		isScopeEnabled,
		scope: isEveryTargetInRule(items, page.view.targetIds, scope.rule) ? scope : undefined,
	};
}
