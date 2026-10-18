import { useCallback } from 'react';

import type { MapTrackDetail } from '#types.ts';

import { useMapConfig } from '#lib/config.tsx';
import { trackMap } from '#track.ts';

export function useTrackMap() {
	const { mapId } = useMapConfig();

	return useCallback(
		(detail: Omit<MapTrackDetail, 'mapId'>) => {
			trackMap({ ...detail, mapId });
		},
		[mapId],
	);
}
