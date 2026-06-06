import type { ReactNode } from 'react';

import { createContext, useState } from 'react';

import type { MapDataConfigurableState } from './store-factory';

import { createMapStore } from './store-factory';

export const MapStoreContext = createContext<ReturnType<typeof createMapStore> | undefined>(
	undefined,
);

export const MapStoreProvider = ({
	initialState,
	children,
}: {
	initialState?: Partial<MapDataConfigurableState>;
	children: ReactNode;
}) => {
	const [mapStore] = useState(() => createMapStore(initialState));

	return <MapStoreContext.Provider value={mapStore}>{children}</MapStoreContext.Provider>;
};
