import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MouseEvent } from 'react';

import { getMapRowById } from '@spectralcodex/map-codec';
import { useCallback } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapClickHit } from '#host/host-click-factory.ts';

import { useMapRows } from '#data/data-query.ts';
import { resolveClick } from '#host/host-click-factory.ts';
import { isHostPageHidden } from '#host/host-inset.ts';
import { useMapConfig } from '#lib/config.tsx';
import {
	getPopupCoordinates,
	getPopupLayout,
	popupEasePaddingPx,
} from '#lib/popup-layout-factory.ts';
import { useTrackMap } from '#lib/track-hook.ts';
import { selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

function easeToPopup(
	map: MaplibreMap,
	row: MapSourceItem | undefined,
	setPopupVisible: (isVisible: boolean) => void,
) {
	if (!row) return;

	// Calling `stop()` fires the running ease's `moveend` right away, before the listener below is added
	map.stop();

	setPopupVisible(false);

	// Under reduced motion MapLibre zeroes the duration and fires `moveend` synchronously inside `easeTo`
	void map.once('moveend', () => {
		setPopupVisible(true);
	});

	map.easeTo({
		center: getPopupCoordinates(row),
		duration: 150,
		padding: getPopupLayout(map.getContainer().clientWidth).isNarrow
			? { bottom: popupEasePaddingPx, left: 0, right: 0, top: 0 }
			: { bottom: 0, left: 0, right: popupEasePaddingPx, top: 0 },
	});
}

export function useClickResolver() {
	const { host } = useMapConfig();
	const scopeUrl = useMapStore((state) => state.scope?.url);
	const targetIds = useMapStore(selectTargetIds);
	const { data: rows } = useMapRows();

	return useCallback(
		(hit: MapClickHit, map: MaplibreMap) => {
			const row = rows && hit.kind === 'point' ? getMapRowById(rows, hit.pointId) : undefined;

			return resolveClick({
				canOpen: host.isHosted,
				hit,
				isPageHidden: isHostPageHidden(map.getContainer()),
				pointUrl: row?.properties.url,
				scopeUrl,
				targetIds,
			});
		},
		[host, rows, scopeUrl, targetIds],
	);
}

export function useMapClick() {
	const { host } = useMapConfig();
	const { applyClick, setPopupVisible } = useMapStore((state) => state.actions);
	const { data: rows } = useMapRows();
	const resolve = useClickResolver();
	const trackMap = useTrackMap();

	return useCallback(
		(hit: MapClickHit, map: MaplibreMap) => {
			const outcome = resolve(hit, map);

			applyClick(outcome);

			switch (outcome.kind) {
				case 'open': {
					host.open(outcome.url);
					break;
				}
				case 'popup': {
					const row = rows ? getMapRowById(rows, outcome.pointId) : undefined;
					const url = row?.properties.url;

					if (url) trackMap({ data: { location: url }, name: 'map-popup-open' });
					if (outcome.isEased) easeToPopup(map, row, setPopupVisible);
					break;
				}
			}

			return outcome;
		},
		[applyClick, host, resolve, rows, setPopupVisible, trackMap],
	);
}

export function useMapLinkClick(url: string) {
	const { current: map } = useMap();
	const click = useMapClick();

	return (event: MouseEvent<HTMLAnchorElement>) => {
		if (!map || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		if (click({ kind: 'link', url }, map.getMap()).kind === 'open') event.preventDefault();
	};
}
