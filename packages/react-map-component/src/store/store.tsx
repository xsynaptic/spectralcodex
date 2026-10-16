import type { ReactNode } from 'react';

import { createContext, useContext, useState } from 'react';
import { useStore } from 'zustand';

import type { MapDataStore } from '#store/store-factory.ts';
import type { MapStoreView } from '#types.ts';

import { createMapStore } from '#store/store-factory.ts';

const MapStoreContext = createContext<ReturnType<typeof createMapStore> | undefined>(undefined);

export function MapStoreProvider({ children, page }: { children: ReactNode; page: MapStoreView }) {
	const [mapStore] = useState(() => createMapStore(page));

	return <MapStoreContext.Provider value={mapStore}>{children}</MapStoreContext.Provider>;
}

export function useMapStoreApi() {
	const store = useContext(MapStoreContext);

	if (!store) throw new Error('[Map] Map store used outside its provider');

	return store;
}

export function useMapStore<T>(selector: (state: MapDataStore) => T): T {
	return useStore(useMapStoreApi(), selector);
}
