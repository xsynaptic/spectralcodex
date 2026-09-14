import type { ReactNode } from 'react';

import { createContext, useState } from 'react';

import type { MapDataConfigurableState } from '#store/store-factory.ts';

import { createMapStore } from '#store/store-factory.ts';

export const MapStoreContext = createContext<ReturnType<typeof createMapStore> | undefined>(
	undefined,
);

export const MapStoreProvider = ({
	initialState,
	children,
}: {
	children: ReactNode;
	initialState?: Partial<MapDataConfigurableState>;
}) => {
	const [mapStore] = useState(() => createMapStore(initialState));

	return <MapStoreContext.Provider value={mapStore}>{children}</MapStoreContext.Provider>;
};
