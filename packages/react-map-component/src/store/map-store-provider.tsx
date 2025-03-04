import type { ReactNode } from 'react';

import { createContext } from 'react';

import type { MapDataConfigurableState } from './map-store-types';

import { useMapStoreSetup } from './hooks/use-map-store-setup';

export const MapStoreContext = createContext<ReturnType<typeof useMapStoreSetup> | undefined>(
	undefined,
);

export const MapStoreProvider = ({
	initialState,
	buildId,
	children,
}: {
	initialState?: Partial<MapDataConfigurableState>;
	buildId?: string | undefined;
	children: ReactNode;
}) => {
	const mapStore = useMapStoreSetup({ initialState, buildId });

	return <MapStoreContext.Provider value={mapStore}>{children}</MapStoreContext.Provider>;
};
