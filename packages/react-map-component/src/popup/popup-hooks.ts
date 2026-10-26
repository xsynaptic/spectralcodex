import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';
import type { LngLat } from 'maplibre-gl';

import { getMapRowLabel } from '@spectralcodex/map-codec';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { useMapChunk, useMapRow } from '#data/data-query.ts';
import { useClickResolver } from '#host/host-click.ts';
import { useMapConfig } from '#lib/config.tsx';
import { getPopupCoordinates, getPopupLayout } from '#lib/popup-layout-factory.ts';
import {
	findPopupImageSources,
	getPopupImageSizes,
	getPopupImageSrcSet,
} from '#popup/popup-factory.ts';
import { useMapStore } from '#store/store.tsx';

export type MapPopupItemExtended = MapPopupItem &
	Pick<MapSourceItem['properties'], 'url'> & {
		popupCoordinates: LngLat;
		precision: number | undefined;
	};

const mapHoverPreloadDelayMs = 100;

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delayMs);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delayMs]);

	return debouncedValue;
}

export function useMapCanvasPopup() {
	const selectedId = useMapStore((state) => state.selectedId);
	const selectedSourceItem = useMapRow(selectedId);
	const { data: chunkData, isLoading } = useMapChunk(selectedSourceItem?.properties.chunkKey);

	const popupItem = useMemo(() => {
		if (!selectedId || !selectedSourceItem) return;

		const { precision, url } = selectedSourceItem.properties;

		return {
			title: getMapRowLabel(selectedSourceItem.properties),
			...chunkData?.find((item) => item.id === selectedId),
			id: selectedId,
			popupCoordinates: getPopupCoordinates(selectedSourceItem),
			precision,
			url,
		} satisfies MapPopupItemExtended;
	}, [selectedId, chunkData, selectedSourceItem]);

	return { isLoading, popupItem };
}

export function useMapHoverPreload() {
	const { host, imageBaseUrl } = useMapConfig();
	const { current: map } = useMap();
	const hoveredId = useMapStore((state) => state.hoveredId);
	const resolve = useClickResolver();
	const { maxWidthPx } = useMapPopupLayout();

	const debouncedHoveredId = useDebouncedValue(hoveredId, mapHoverPreloadDelayMs);

	const hoveredSourceItem = useMapRow(debouncedHoveredId);
	const { data: hoverChunkData } = useMapChunk(hoveredSourceItem?.properties.chunkKey);

	const preloadedRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!map || !debouncedHoveredId || preloadedRef.current.has(debouncedHoveredId)) return;

		const outcome = resolve(
			{ isPick: false, kind: 'point', pointId: debouncedHoveredId },
			map.getMap(),
		);

		if (outcome.kind === 'open') {
			preloadedRef.current.add(debouncedHoveredId);
			host.prefetch(outcome.url);
			return;
		}

		if (outcome.kind !== 'popup') return;

		const popupImageSources = findPopupImageSources(hoverChunkData, debouncedHoveredId);

		if (!popupImageSources) return;

		preloadedRef.current.add(debouncedHoveredId);

		// A detached image given srcset and sizes picks the same candidate the popup will, which warms the cache
		const preloadImage = new Image();

		preloadImage.sizes = getPopupImageSizes(maxWidthPx);
		preloadImage.srcset = getPopupImageSrcSet(popupImageSources, imageBaseUrl);
	}, [debouncedHoveredId, host, hoverChunkData, imageBaseUrl, map, maxWidthPx, resolve]);
}

export function useMapPopupLayout() {
	const { current: map } = useMap();

	const subscribe = useCallback(
		(callback: () => void) => {
			map?.on('resize', callback);

			return () => {
				map?.off('resize', callback);
			};
		},
		[map],
	);

	const getWidth = useCallback(() => map?.getContainer().clientWidth ?? 0, [map]);

	const containerWidth = useSyncExternalStore(subscribe, getWidth, () => 0);

	return useMemo(() => getPopupLayout(containerWidth), [containerWidth]);
}
