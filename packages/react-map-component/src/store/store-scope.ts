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
	pendingTargetIds: ReadonlyArray<ReadonlyArray<string>>;
	scope: MapScope | undefined;
}

const noPendingTargetIds: MapScopeState['pendingTargetIds'] = [];

export function resolveMapScope(
	{ isScopeEnabled, pendingTargetIds, scope }: MapScopeState,
	items: ReadonlyArray<MapSourceItem>,
): MapScopeState {
	if (!scope || pendingTargetIds.length === 0) {
		return { isScopeEnabled, pendingTargetIds, scope };
	}

	const isKept = pendingTargetIds.every((targetIds) =>
		isEveryTargetInRule(items, targetIds, scope.rule),
	);

	return {
		isScopeEnabled,
		pendingTargetIds: noPendingTargetIds,
		scope: isKept ? scope : undefined,
	};
}

export function reduceMapScope(
	{ isScopeEnabled, pendingTargetIds, scope }: MapScopeState,
	page: MapStoreView,
	items: ReadonlyArray<MapSourceItem> | undefined,
): MapScopeState {
	const { targetIds } = page.view;

	if (page.view.scope) {
		return { isScopeEnabled: true, pendingTargetIds: noPendingTargetIds, scope: page.view.scope };
	}

	const next = {
		isScopeEnabled,
		pendingTargetIds:
			scope && isScopeEnabled && targetIds ? [...pendingTargetIds, targetIds] : pendingTargetIds,
		scope,
	};

	return items ? resolveMapScope(next, items) : next;
}
