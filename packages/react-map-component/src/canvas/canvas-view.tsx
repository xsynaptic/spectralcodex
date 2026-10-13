import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useEffect, useMemo } from 'react';

import type { MapComponentProps, MapScope } from '#types.ts';

import { parseMapView } from '#canvas/canvas-view-factory.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useMapHost } from '#host/host-context.tsx';
import { useHostViewKey } from '#host/host-view.ts';
import { reduceMapScope } from '#store/store-scope.ts';
import {
	useIsMapScopeEnabled,
	useMapScopeViewKey,
	useMapStoreActions,
	useMapStoreScope,
} from '#store/store.ts';

const emptyTargetIds: Array<string> = [];

interface MapViewContextValue {
	// From the page's own view, not the Scope in force, so turning the Scope off does not re-run the camera fit
	bounds?: MapComponentProps['bounds'] | undefined;
	scope?: MapScope | undefined;
	scopeHeld?: MapScope | undefined;
	targetIds: Array<string>;
}

const MapViewContext = createContext<MapViewContextValue>({ targetIds: emptyTargetIds });

const HostViewProvider: FC<PropsWithChildren<{ isDev: boolean | undefined }>> =
	function HostViewProvider({ children, isDev }) {
		const viewKey = useHostViewKey();
		const { data: sourceData } = useSourceDataQuery();

		const storeScope = useMapStoreScope();
		const isStoreScopeEnabled = useIsMapScopeEnabled();
		const scopeViewKey = useMapScopeViewKey();
		const { setScope } = useMapStoreActions();

		const view = useMemo(() => parseMapView(viewKey, isDev), [viewKey, isDev]);

		// Computed in render; from the effect below, one frame would draw the new page with the previous Scope
		const { isScopeEnabled, isSettled, scope } = useMemo(
			() =>
				reduceMapScope(
					{ isScopeEnabled: isStoreScopeEnabled, scope: storeScope, viewKey: scopeViewKey },
					{ view, viewKey },
					sourceData,
				),
			[isStoreScopeEnabled, scopeViewKey, sourceData, storeScope, view, viewKey],
		);

		useEffect(() => {
			if (isSettled && scopeViewKey !== viewKey) setScope(scope, isScopeEnabled, viewKey);
		}, [isScopeEnabled, isSettled, scope, scopeViewKey, setScope, viewKey]);

		const context = useMemo(
			() => ({
				bounds: view.scope?.bounds,
				scope: isScopeEnabled ? scope : undefined,
				scopeHeld: scope,
				targetIds: view.targetIds ?? emptyTargetIds,
			}),
			[isScopeEnabled, scope, view],
		);

		return <MapViewContext.Provider value={context}>{children}</MapViewContext.Provider>;
	};

// A hosted map reads its view from the host, so it changes after mount; any other map takes it from props
export const MapViewProvider: FC<
	PropsWithChildren<Pick<MapComponentProps, 'isDev' | 'targetIds'>>
> = function MapViewProvider({ children, isDev, targetIds }) {
	const host = useMapHost();
	const view = useMemo(() => ({ targetIds: targetIds ?? emptyTargetIds }), [targetIds]);

	if (host) {
		return <HostViewProvider isDev={isDev}>{children}</HostViewProvider>;
	}

	return <MapViewContext.Provider value={view}>{children}</MapViewContext.Provider>;
};

export function useMapView() {
	return useContext(MapViewContext);
}

export function useMapTargetIds() {
	return useMapView().targetIds;
}
