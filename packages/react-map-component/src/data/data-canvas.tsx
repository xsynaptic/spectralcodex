import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useDeferredValue, useMemo } from 'react';

import type { MapCanvasData } from '#data/data-filter.ts';

import { getHiddenTargetIds, getMapCanvasData } from '#data/data-filter.ts';
import { useMapRows } from '#data/data-query.ts';
import { selectScope, selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

const emptyItems = [] as const;

const CanvasDataContext = createContext<MapCanvasData | undefined>(undefined);

export const CanvasDataProvider: FC<PropsWithChildren> = function CanvasDataProvider({ children }) {
	const { data: sourceData } = useMapRows();
	const scopeRule = useMapStore(selectScope)?.rule;
	const targetIds = useMapStore(selectTargetIds);

	const filter = useDeferredValue(useMapStore((state) => state.filter));

	// Joined into a string so that a new Target the filter doesn't hide keeps the same clusters
	const pinnedKey = useMemo(
		() => getHiddenTargetIds(sourceData ?? emptyItems, targetIds, filter).join(' '),
		[sourceData, targetIds, filter],
	);

	const canvasData = useMemo(
		() =>
			getMapCanvasData(
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
