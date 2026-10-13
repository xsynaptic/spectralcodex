import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { LngLat } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { useChunkPopup } from '#data/data-popup-chunks.tsx';
import { usePopupDataQuery } from '#data/data-popup.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import {
	findPopupImageSrcSet,
	getPopupImageSizes,
	getPopupImageSrcSet,
	getPopupLayout,
} from '#popup/popup-factory.ts';
import { useMapHoveredId, useMapSelectedId } from '#store/store.ts';

export type MapPopupItemExtended = MapPopupItem & {
	objective: number | undefined;
	popupCoordinates: LngLat;
	precision: number | undefined;
};

const defaultPopupItem = {
	description: undefined,
	googleMapsUrl: undefined,
	id: 'default',
	image: undefined,
	objective: undefined,
	own: undefined,
	popupCoordinates: new LngLat(0, 0),
	precision: 1,
	title: 'Untitled',
	titleMultilingualLang: undefined,
	titleMultilingualValue: undefined,
	url: undefined,
	wikipediaUrl: undefined,
} satisfies MapPopupItemExtended;

function getPopupCoordinates({ geometry }: MapSourceItem): LngLat {
	switch (geometry.type) {
		case GeometryTypeEnum.LineString: {
			const coordinates = geometry.coordinates as Array<[number, number]>;

			if (!coordinates[0]) return new LngLat(0, 0);

			const [lng, lat] = coordinates[0];

			return new LngLat(lng, lat);
		}

		case GeometryTypeEnum.Point: {
			const [lng, lat] = geometry.coordinates as [number, number];

			return new LngLat(lng, lat);
		}

		case GeometryTypeEnum.Polygon: {
			const coordinates = geometry.coordinates as Array<Array<[number, number]>>;

			if (!coordinates[0]) return new LngLat(0, 0);
			if (!coordinates[0][0]) return new LngLat(0, 0);

			const [lng, lat] = coordinates[0][0];

			return new LngLat(lng, lat);
		}

		default: {
			console.warn(`[Map] Unsupported geometry type for popup:`, geometry);

			return new LngLat(0, 0);
		}
	}
}

const mapImagePreloadDelayMs = 100;

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

// Source data carries only part of a popup; the rest comes from chunks fetched on demand
export function useMapCanvasPopup(sourceDataIndex: Map<string, MapSourceItem>) {
	const selectedId = useMapSelectedId();

	const inlinePopupQuery = usePopupDataQuery();
	const inlinePopupData = inlinePopupQuery.data;

	const selectedSourceItem = selectedId ? sourceDataIndex.get(selectedId) : undefined;

	// Without a chunk key the popup data is inline (objectives, MDX)
	const chunkKey = selectedSourceItem?.properties.chunkKey;
	const chunkQuery = useChunkPopup(chunkKey);

	const isLoading = (chunkKey ? chunkQuery : inlinePopupQuery).isLoading;

	const popupItem = useMemo(() => {
		if (!selectedId) return;

		const popupSource = chunkKey ? chunkQuery.data : inlinePopupData;

		return {
			...defaultPopupItem,
			// The title comes from source data first, so a failed chunk fetch still shows a title-only popup
			...(selectedSourceItem ? { title: selectedSourceItem.properties.title } : {}),
			...popupSource?.find((item) => item.id === selectedId),
			...(selectedSourceItem
				? {
						objective: selectedSourceItem.properties.objective,
						popupCoordinates: getPopupCoordinates(selectedSourceItem),
						precision: selectedSourceItem.properties.precision,
					}
				: {}),
			id: selectedId,
		} satisfies MapPopupItemExtended;
	}, [selectedId, chunkKey, inlinePopupData, chunkQuery.data, selectedSourceItem]);

	return { isLoading, popupItem };
}

export function useMapImagePreload({
	imageServerUrl,
	isEnabled,
	sourceDataIndex,
}: {
	imageServerUrl: string;
	isEnabled: boolean;
	sourceDataIndex: Map<string, MapSourceItem>;
}) {
	const hoveredId = useMapHoveredId();
	const { data: inlinePopupData } = usePopupDataQuery();
	const { maxWidthPx } = useMapPopupLayout();

	// Debounced so that sweeping across a dense area doesn't request a chunk for every point crossed
	const debouncedHoveredId = useDebouncedValue(hoveredId, mapImagePreloadDelayMs);

	const hoveredSourceItem = debouncedHoveredId
		? sourceDataIndex.get(debouncedHoveredId)
		: undefined;
	const hoverChunkKey = hoveredSourceItem?.properties.chunkKey;
	const { data: hoverChunkData } = useChunkPopup(hoverChunkKey);

	const preloadedRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!isEnabled || !debouncedHoveredId || preloadedRef.current.has(debouncedHoveredId)) return;

		const srcSet = findPopupImageSrcSet(
			hoverChunkKey ? hoverChunkData : inlinePopupData,
			debouncedHoveredId,
		);

		if (!srcSet) return;

		preloadedRef.current.add(debouncedHoveredId);

		// A detached image given srcset and sizes picks the same candidate the popup will, which warms the cache
		const preloadImage = new Image();

		preloadImage.sizes = getPopupImageSizes(maxWidthPx);
		preloadImage.srcset = getPopupImageSrcSet(srcSet, imageServerUrl);
	}, [
		debouncedHoveredId,
		hoverChunkKey,
		inlinePopupData,
		hoverChunkData,
		imageServerUrl,
		isEnabled,
		maxWidthPx,
	]);
}

export function useSourceDataIndex(): Map<string, MapSourceItem> {
	const { data: sourceData } = useSourceDataQuery();

	return useMemo(() => {
		const index = new Map<string, MapSourceItem>();

		if (sourceData) {
			for (const item of sourceData) {
				index.set(item.properties.id, item);
			}
		}

		return index;
	}, [sourceData]);
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
