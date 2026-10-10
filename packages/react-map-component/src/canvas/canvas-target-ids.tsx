import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

import type { MapComponentProps, MapHostOptions } from '#types.ts';

import { parseMapView } from '#canvas/canvas-view-factory.ts';
import { useDocumentAttribute } from '#lib/document-attribute.ts';

const emptyTargetIds: Array<string> = [];

const TargetIdsContext = createContext<Array<string>>(emptyTargetIds);

const HostTargetIdsProvider: FC<
	PropsWithChildren<{ host: MapHostOptions; isDev: boolean | undefined }>
> = function HostTargetIdsProvider({ children, host, isDev }) {
	const value = useDocumentAttribute(host.viewAttribute, host.syncEventName);

	const targetIds = useMemo(
		() => parseMapView(value, isDev).targetIds ?? emptyTargetIds,
		[value, isDev],
	);

	return <TargetIdsContext.Provider value={targetIds}>{children}</TargetIdsContext.Provider>;
};

// A hosted map reads its Targets from the host's view, so they change after mount; any other map takes the prop
export const MapTargetIdsProvider: FC<
	PropsWithChildren<Pick<MapComponentProps, 'host' | 'isDev' | 'targetIds'>>
> = function MapTargetIdsProvider({ children, host, isDev, targetIds }) {
	if (host) {
		return (
			<HostTargetIdsProvider host={host} isDev={isDev}>
				{children}
			</HostTargetIdsProvider>
		);
	}

	return (
		<TargetIdsContext.Provider value={targetIds ?? emptyTargetIds}>
			{children}
		</TargetIdsContext.Provider>
	);
};

export function useMapTargetIds() {
	return useContext(TargetIdsContext);
}
