import { createContext, useCallback, useContext } from 'react';

import type { MapTrackDetail } from '#types.ts';

import { trackMap } from '#lib/track.ts';

export const MapTrackContext = createContext<string | undefined>(undefined);

export function useTrackMap() {
	const mapId = useContext(MapTrackContext);

	return useCallback(
		(detail: Omit<MapTrackDetail, 'mapId'>) => {
			trackMap({ ...detail, mapId });
		},
		[mapId],
	);
}
