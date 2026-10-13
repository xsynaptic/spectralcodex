import type { FC, PropsWithChildren } from 'react';

import { createContext, useContext } from 'react';

import type { MapHostOptions } from '#types.ts';

const MapHostContext = createContext<MapHostOptions | undefined>(undefined);

export const MapHostProvider: FC<PropsWithChildren<{ host: MapHostOptions | undefined }>> =
	function MapHostProvider({ children, host }) {
		return <MapHostContext.Provider value={host}>{children}</MapHostContext.Provider>;
	};

export function useMapHost() {
	return useContext(MapHostContext);
}
