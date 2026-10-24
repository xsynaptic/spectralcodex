import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';
import type { LngLat } from 'maplibre-gl';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { useMapChunk, useMapRow } from '#data/data-query.ts';
import { useClickResolver } from '#host/host-click.ts';
import { useMapConfig } from '#lib/config.tsx';
import { getPopupCoordinates, getPopupLayout } from '#lib/popup-layout-factory.ts';
import {
	findPopupImageSrcSet,
	getPopupImageSizes,
	getPopupImageSrcSet,
} from '#popup/popup-factory.ts';
import { useMapStore } from '#store/store.tsx';

export type MapPopupItemExtended = MapPopupItem &
	Pick<MapSourceItem['properties'], 'pointTitle' | 'url'> & {
		popupCoordinates: LngLat;
		precision: number | undefined;
	};

const mapImagePreloadDelayMs = 100;

function getRowTitle({ title, titleMultilingual }: MapSourceItem['properties']) {
	return titleMultilingual ? `${title} (${titleMultilingual})` : title;
}

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

		const { pointTitle, precision, url } = selectedSourceItem.properties;

		return {
			title: getRowTitle(selectedSourceItem.properties),
			...chunkData?.find((item) => item.id === selectedId),
			id: selectedId,
			pointTitle,
			popupCoordinates: getPopupCoordinates(selectedSourceItem),
			precision,
			url,
		} satisfies MapPopupItemExtended;
	}, [selectedId, chunkData, selectedSourceItem]);

	return { isLoading, popupItem };
}

export function useMapImagePreload() {
	const { imageBaseUrl } = useMapConfig();
	const { current: map } = useMap();
	const hoveredId = useMapStore((state) => state.hoveredId);
	const resolve = useClickResolver();
	const { maxWidthPx } = useMapPopupLayout();

	const debouncedHoveredId = useDebouncedValue(hoveredId, mapImagePreloadDelayMs);

	const hoveredSourceItem = useMapRow(debouncedHoveredId);
	const { data: hoverChunkData } = useMapChunk(hoveredSourceItem?.properties.chunkKey);

	const preloadedRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!map || !debouncedHoveredId || preloadedRef.current.has(debouncedHoveredId)) return;

		const outcome = resolve(
			{ isPick: false, kind: 'point', pointId: debouncedHoveredId },
			map.getMap(),
		);

		if (outcome.kind !== 'popup') return;

		const srcSet = findPopupImageSrcSet(hoverChunkData, debouncedHoveredId);

		if (!srcSet) return;

		preloadedRef.current.add(debouncedHoveredId);

		// A detached image given srcset and sizes picks the same candidate the popup will, which warms the cache
		const preloadImage = new Image();

		preloadImage.sizes = getPopupImageSizes(maxWidthPx);
		preloadImage.srcset = getPopupImageSrcSet(srcSet, imageBaseUrl);
	}, [debouncedHoveredId, hoverChunkData, imageBaseUrl, map, maxWidthPx, resolve]);
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
