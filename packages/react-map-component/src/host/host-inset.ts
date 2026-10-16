import type { MapRef } from 'react-map-gl/maplibre';

import { useCallback } from 'react';

import { mapInsetProperty, mapPageHiddenProperty, mapSyncEventName } from '#constants.ts';
import { useDocumentEventValue } from '#lib/document-event.ts';

function readHostNumber(container: HTMLElement, property: string) {
	const value = Number(getComputedStyle(container).getPropertyValue(property).replace('px', ''));

	return Number.isFinite(value) && value > 0 ? value : 0;
}

function readHostInset(container: HTMLElement | undefined) {
	return container ? Math.round(readHostNumber(container, mapInsetProperty)) : 0;
}

export function isHostPageHidden(container: HTMLElement) {
	return readHostNumber(container, mapPageHiddenProperty) > 0;
}

export function useHostInset(map: MapRef | undefined) {
	const getInset = useCallback(() => readHostInset(map?.getContainer()), [map]);

	return useDocumentEventValue(mapSyncEventName, getInset, 0);
}

export function applyHostInset(map: MapRef, inset: number) {
	if (map.getPadding().bottom === inset) return;

	const container = map.getContainer();

	// Easing the padding makes the map drift, so jump once and shift the center to compensate
	map.jumpTo({
		center: map.unproject([container.clientWidth / 2, (container.clientHeight - inset) / 2]),
		padding: { bottom: inset, left: 0, right: 0, top: 0 },
	});
}
