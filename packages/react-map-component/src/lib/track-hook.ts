import { useCallback } from 'react';

import type { MapTrackDetail, MapTrackName } from '#types.ts';

import { useMapConfig } from '#lib/config.tsx';
import { trackMap } from '#track.ts';

export function useTrackMap() {
	const { mapId } = useMapConfig();

	return useCallback(
		(detail: Omit<MapTrackDetail, 'mapId' | 'name'> & { name: MapTrackName }) => {
			trackMap({ ...detail, mapId });
		},
		[mapId],
	);
}
