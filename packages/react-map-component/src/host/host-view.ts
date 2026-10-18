import { MapViewSchema } from '@spectralcodex/map-codec';
import { useEffect } from 'react';

import type { MapView } from '#types.ts';

import { mapSyncEventName } from '#constants.ts';
import { useEnsureMapRows } from '#data/data-query.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useMapStore } from '#store/store.tsx';

export function parseMapView(value: string | undefined, isDev = false): MapView {
	if (!value) return {};

	try {
		return MapViewSchema.parse(JSON.parse(value));
	} catch (error) {
		if (isDev) console.warn('[Map] Malformed host view:', error);

		return {};
	}
}

export function useHostViewSync() {
	const { host } = useMapConfig();
	const { syncView } = useMapStore((state) => state.actions);
	const ensureRows = useEnsureMapRows();

	useEffect(() => {
		async function sync() {
			const page = host.readView();

			try {
				syncView(page, await ensureRows());
			} catch {
				syncView(page, undefined);
			}
		}

		function handleSync() {
			void sync();
		}

		document.addEventListener(mapSyncEventName, handleSync);

		// A sync can land after render reads the view but before this listener attaches
		void sync();

		return () => {
			document.removeEventListener(mapSyncEventName, handleSync);
		};
	}, [ensureRows, host, syncView]);
}
