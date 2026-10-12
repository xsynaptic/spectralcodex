import type { MapTrackDetail } from '#types.ts';

import { mapTrackEventName } from '#constants.ts';

const trackedErrorKinds = new Set<string>();

export function trackMap(detail: MapTrackDetail) {
	document.dispatchEvent(new CustomEvent<MapTrackDetail>(mapTrackEventName, { detail }));
}

export function trackMapErrorOnce(kind: string) {
	if (trackedErrorKinds.has(kind)) return;

	trackedErrorKinds.add(kind);
	trackMap({ data: { kind }, name: 'map-error' });
}
