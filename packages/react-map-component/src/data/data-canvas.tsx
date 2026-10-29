import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useDeferredValue, useMemo } from 'react';

import type { MapCanvasData, MapFilterState } from '#data/data-filter.ts';
import type { MapFeaturesRule } from '#types.ts';

import { getHiddenTargetIds, getMapCanvasData } from '#data/data-filter.ts';
import { useMapRows } from '#data/data-query.ts';
import { selectScope, selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

const emptyItems = [] as const;

const canvasDataCacheSize = 4;

const canvasDataByItems = new WeakMap<ReadonlyArray<MapSourceItem>, Map<string, MapCanvasData>>();

const CanvasDataContext = createContext<MapCanvasData | undefined>(undefined);

// A new Point array rebuilds the cluster index, so a Scope toggled back or a restarted deferred render reuses the last one
function getCachedCanvasData(
	items: ReadonlyArray<MapSourceItem>,
	filter: MapFilterState,
	scopeRule: MapFeaturesRule | undefined,
) {
	const key = JSON.stringify([
		filter.objective,
		filter.rating,
		filter.status.toSorted((first, second) => first.localeCompare(second)),
		filter.pinnedIds,
		scopeRule,
	]);
	const cache = canvasDataByItems.get(items) ?? new Map<string, MapCanvasData>();
	const canvasData = cache.get(key) ?? getMapCanvasData(items, filter, scopeRule);

	cache.delete(key);
	cache.set(key, canvasData);
	canvasDataByItems.set(items, cache);

	const [oldestKey] = cache.keys();

	if (oldestKey !== undefined && cache.size > canvasDataCacheSize) cache.delete(oldestKey);

	return canvasData;
}

export const CanvasDataProvider: FC<PropsWithChildren> = function CanvasDataProvider({ children }) {
	const { data: sourceData } = useMapRows();
	const targetIds = useMapStore(selectTargetIds);

	const filter = useDeferredValue(useMapStore((state) => state.filter));
	const scopeRule = useDeferredValue(useMapStore(selectScope)?.rule);

	// Joined into a string so that a new Target the filter doesn't hide keeps the same clusters
	const pinnedKey = useMemo(
		() => getHiddenTargetIds(sourceData ?? emptyItems, targetIds, filter).join(' '),
		[sourceData, targetIds, filter],
	);

	const canvasData = useMemo(
		() =>
			getCachedCanvasData(
				sourceData ?? emptyItems,
				pinnedKey ? { ...filter, pinnedIds: pinnedKey.split(' ') } : filter,
				scopeRule,
			),
		[sourceData, filter, scopeRule, pinnedKey],
	);

	return <CanvasDataContext.Provider value={canvasData}>{children}</CanvasDataContext.Provider>;
};

export function useMapCanvasData() {
	const context = useContext(CanvasDataContext);

	if (!context) {
		throw new Error('[Map] Canvas data used outside its provider');
	}

	return context;
}
