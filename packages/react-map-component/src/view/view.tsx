import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useMemo, useState } from 'react';

import type { MapComponentProps, MapScope } from '#types.ts';
import type { MapScopeState } from '#view/view-scope.ts';

import { useSourceDataQuery } from '#data/data-source.tsx';
import { useMapHost } from '#host/host-context.tsx';
import { useHostViewKey } from '#host/host-view.ts';
import { parseMapView } from '#view/view-factory.ts';
import { reduceMapScope } from '#view/view-scope.ts';

const emptyTargetIds: Array<string> = [];

interface MapViewContextValue {
	// From the page's own view, not the Scope in force, so turning the Scope off does not re-run the camera fit
	bounds?: MapComponentProps['bounds'] | undefined;
	scope?: MapScope | undefined;
	scopeHeld?: MapScope | undefined;
	setScopeEnabled: (isScopeEnabled: boolean) => void;
	targetIds: Array<string>;
}

const initialScopeState: MapScopeState = {
	isScopeEnabled: true,
	scope: undefined,
	viewKey: undefined,
};

const unhostedView: MapViewContextValue = {
	setScopeEnabled: () => {
		throw new Error('Only a hosted map holds a Scope!');
	},
	targetIds: emptyTargetIds,
};

const MapViewContext = createContext(unhostedView);

const HostViewProvider: FC<PropsWithChildren<{ isDev: boolean | undefined }>> =
	function HostViewProvider({ children, isDev }) {
		const viewKey = useHostViewKey();
		const { data: sourceData } = useSourceDataQuery();

		const [scopeState, setScopeState] = useState(initialScopeState);

		const view = useMemo(() => parseMapView(viewKey, isDev), [viewKey, isDev]);

		const { isScopeEnabled, isSettled, scope } = reduceMapScope(
			scopeState,
			{ view, viewKey },
			sourceData,
		);

		if (isSettled && scopeState.viewKey !== viewKey) {
			setScopeState({ isScopeEnabled, scope, viewKey });
		}

		const context = useMemo(
			() => ({
				bounds: view.scope?.bounds,
				scope: isScopeEnabled ? scope : undefined,
				scopeHeld: scope,
				setScopeEnabled: (isScopeEnabled: boolean) => {
					setScopeState((state) => ({ ...state, isScopeEnabled }));
				},
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
	const view = useMemo(
		() => (targetIds ? { ...unhostedView, targetIds } : unhostedView),
		[targetIds],
	);

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
