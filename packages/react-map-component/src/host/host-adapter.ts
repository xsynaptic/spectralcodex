import * as R from 'remeda';

import type { MapComponentProps, MapHost, MapHostControlName } from '#types.ts';

import {
	mapControlEventName,
	mapOpenEventName,
	mapPrefetchEventName,
	mapViewAttribute,
} from '#constants.ts';
import { parseMapView } from '#host/host-view.ts';

function send(name: MapHostControlName) {
	document.dispatchEvent(new CustomEvent(mapControlEventName, { detail: { name } }));
}

export function createMapHost({
	controls = [],
	host,
	isDev,
	targetIds,
}: MapComponentProps): MapHost {
	if (!host) {
		const view = { view: targetIds ? { targetIds } : {}, viewKey: undefined };

		return {
			controls,
			fullscreenContainerId: undefined,
			isHosted: false,
			open: R.doNothing(),
			prefetch: R.doNothing(),
			readView: () => view,
			send,
		};
	}

	return {
		controls,
		fullscreenContainerId: host.fullscreenContainerId,
		isHosted: true,
		open: (url) => {
			document.dispatchEvent(new CustomEvent(mapOpenEventName, { detail: { url } }));
		},
		prefetch: (url) => {
			document.dispatchEvent(new CustomEvent(mapPrefetchEventName, { detail: { url } }));
		},
		readView: () => {
			const viewKey =
				typeof document === 'undefined'
					? undefined
					: (document.documentElement.getAttribute(mapViewAttribute) ?? undefined);

			return { view: parseMapView(viewKey, isDev), viewKey };
		},
		send,
	};
}
