import type { MapRef } from 'react-map-gl/maplibre';

import { useCallback } from 'react';

import { mapInsetProperty } from '#constants.ts';
import { useHostSyncValue } from '#host/host-view.ts';

function readHostInset(container: HTMLElement | undefined) {
	if (!container) return 0;

	const inset = Number(
		getComputedStyle(container).getPropertyValue(mapInsetProperty).replace('px', ''),
	);

	return Number.isFinite(inset) && inset > 0 ? Math.round(inset) : 0;
}

export function useHostInset(map: MapRef | undefined) {
	const getInset = useCallback(() => readHostInset(map?.getContainer()), [map]);

	return useHostSyncValue(getInset, 0);
}

export function applyHostInset(map: MapRef, inset: number) {
	if (map.getPadding().bottom === inset) return;

	const container = map.getContainer();

	map.jumpTo({
		center: map.unproject([container.clientWidth / 2, (container.clientHeight - inset) / 2]),
		padding: { bottom: inset, left: 0, right: 0, top: 0 },
	});
}
