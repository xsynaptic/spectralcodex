import { isMapView } from '@spectralcodex/map-codec';
import { useEffect } from 'react';

import type { MapView } from '#types.ts';

import { mapSyncEventName } from '#constants.ts';
import { useMapRows, useReadMapRows } from '#data/data-query.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useMapStore } from '#store/store.tsx';

export function parseMapView(value: string | undefined, isDev = false): MapView {
	if (!value) return {};

	try {
		const view: unknown = JSON.parse(value);

		if (!isMapView(view)) throw new TypeError(`Not a map view: ${value}`);

		return view;
	} catch (error) {
		if (isDev) console.warn('[Map] Malformed host view:', error);

		return {};
	}
}

export function useHostViewSync() {
	const { host } = useMapConfig();
	const { resolveScope, syncView } = useMapStore((state) => state.actions);
	const { data: rows } = useMapRows();
	const readRows = useReadMapRows();

	// A refetch after a failed fetch brings rows with no map:sync
	useEffect(() => {
		if (rows) resolveScope(rows);
	}, [resolveScope, rows]);

	useEffect(() => {
		function sync() {
			syncView(host.readView(), readRows());
		}

		document.addEventListener(mapSyncEventName, sync);

		// A sync can land after render reads the view but before this listener attaches
		sync();

		return () => {
			document.removeEventListener(mapSyncEventName, sync);
		};
	}, [host, readRows, syncView]);
}
