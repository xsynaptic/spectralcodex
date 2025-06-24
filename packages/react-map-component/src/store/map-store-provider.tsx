import type { ReactNode } from 'react';

import { createContext } from 'react';

import type { MapDataConfigurableState } from './map-store-types';

import { useMapStoreSetup } from './hooks/use-map-store-setup';

export const MapStoreContext = createContext<ReturnType<typeof useMapStoreSetup> | undefined>(
	undefined,
);

export const MapStoreProvider = ({
	initialState,
	children,
}: {
	initialState?: Partial<MapDataConfigurableState>;
	children: ReactNode;
}) => {
	const mapStore = useMapStoreSetup({ initialState });

	return <MapStoreContext.Provider value={mapStore}>{children}</MapStoreContext.Provider>;
};
