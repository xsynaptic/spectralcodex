import type { MapTrackDetail } from '#lib/types.ts';

import { mapTrackEventName } from '#lib/constants.ts';

const trackedErrorKinds = new Set<string>();

const trackedErrorMessageMaxLength = 100;

// Tile URLs carry the Protomaps key in their query string
export function getTrackedErrorMessage(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);

	return message.replaceAll(/\?\S*/g, '').slice(0, trackedErrorMessageMaxLength);
}

export function trackMap(detail: MapTrackDetail) {
	document.dispatchEvent(new CustomEvent<MapTrackDetail>(mapTrackEventName, { detail }));
}

export function trackMapErrorOnce(
	kind: string,
	getData?: () => Record<string, boolean | number | string>,
) {
	if (trackedErrorKinds.has(kind)) return;

	trackedErrorKinds.add(kind);
	trackMap({ data: { ...getData?.(), kind }, name: 'map-error' });
}
