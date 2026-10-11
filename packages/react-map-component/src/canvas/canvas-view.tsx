import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

import type { MapComponentProps, MapView } from '#types.ts';

import { parseMapView } from '#canvas/canvas-view-factory.ts';
import { mapSyncEventName, mapViewAttribute } from '#constants.ts';
import { useDocumentAttribute } from '#lib/document-attribute.ts';

const emptyTargetIds: Array<string> = [];

interface MapViewContextValue extends Omit<MapView, 'targetIds'> {
	targetIds: Array<string>;
}

const MapViewContext = createContext<MapViewContextValue>({ targetIds: emptyTargetIds });

// Parsed once per attribute value, so the rule and bounds keep their identity until the page's view changes
const HostViewProvider: FC<PropsWithChildren<{ isDev: boolean | undefined }>> =
	function HostViewProvider({ children, isDev }) {
		const value = useDocumentAttribute(mapViewAttribute, mapSyncEventName);

		const view = useMemo(() => {
			const { targetIds = emptyTargetIds, ...rest } = parseMapView(value, isDev);

			return { ...rest, targetIds };
		}, [value, isDev]);

		return <MapViewContext.Provider value={view}>{children}</MapViewContext.Provider>;
	};

// A hosted map reads its view from the host, so it changes after mount; any other map takes it from props
export const MapViewProvider: FC<
	PropsWithChildren<Pick<MapComponentProps, 'apiDivisionUrl' | 'host' | 'isDev' | 'targetIds'>>
> = function MapViewProvider({ apiDivisionUrl, children, host, isDev, targetIds }) {
	const view = useMemo(
		() => ({ apiDivisionUrl, targetIds: targetIds ?? emptyTargetIds }),
		[apiDivisionUrl, targetIds],
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
