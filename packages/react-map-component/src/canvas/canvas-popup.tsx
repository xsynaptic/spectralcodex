import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';
import type { LngLat } from 'maplibre-gl';
import type { FC } from 'react';

import { GeometryTypeEnum, MapSpritesEnum } from '@spectralcodex/shared/map';
import maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popup } from 'react-map-gl/maplibre';

import { MEDIA_QUERY_MOBILE } from '../constants';
import { usePopupDataQuery } from '../data/data-popup';
import { useChunkPopup } from '../data/data-popup-chunks';
import { useSourceDataQuery } from '../data/data-source';
import { useMediaQuery } from '../lib/media-query';
import { useMapMessages } from '../lib/messages';
import {
	useMapHoveredId,
	useMapPopupVisible,
	useMapSelectedId,
	useMapStoreActions,
} from '../store/store';

type MapPopupItemExtended = MapPopupItem & {
	precision: number;
	popupCoordinates: LngLat;
};

const defaultPopupItem = {
	id: 'default',
	title: 'Untitled',
	titleMultilingualLang: undefined,
	titleMultilingualValue: undefined,
	url: undefined,
	description: undefined,
	safety: undefined,
	googleMapsUrl: undefined,
	wikipediaUrl: undefined,
	image: undefined,
	precision: 1,
	popupCoordinates: new maplibregl.LngLat(0, 0),
} satisfies MapPopupItemExtended;

/**
 * Extract popup coordinates from geometry using type discrimination
 * - Point: use coordinates directly
 * - LineString: use first point
 * - Polygon: use first point of outer ring
 */
function getPopupCoordinates({ geometry }: MapSourceItem): maplibregl.LngLat {
	switch (geometry.type) {
		case GeometryTypeEnum.Point: {
			const [lng, lat] = geometry.coordinates as [number, number];

			return new maplibregl.LngLat(lng, lat);
		}

		case GeometryTypeEnum.LineString: {
			const coordinates = geometry.coordinates as Array<[number, number]>;

			if (!coordinates[0]) return new maplibregl.LngLat(0, 0);

			const [lng, lat] = coordinates[0];

			return new maplibregl.LngLat(lng, lat);
		}

		case GeometryTypeEnum.Polygon: {
			const coordinates = geometry.coordinates as Array<Array<[number, number]>>;

			if (!coordinates[0]) return new maplibregl.LngLat(0, 0);
			if (!coordinates[0][0]) return new maplibregl.LngLat(0, 0);

			const [lng, lat] = coordinates[0][0];

			return new maplibregl.LngLat(lng, lat);
		}

		// Should never reach here due to MapGeometry type constraint
		default: {
			console.warn(`[Map] Unsupported geometry type for popup:`, geometry);

			return new maplibregl.LngLat(0, 0);
		}
	}
}

// Generate a standard Google Maps URL from a set of coordinates
function getGoogleMapsUrlFromGeometry(coordinates: LngLat) {
	const url = new URL('https://www.google.com/maps/search/');

	url.searchParams.set('api', '1');
	url.searchParams.set('query', `${String(coordinates.lat)},${String(coordinates.lng)}`);

	return url.href;
}

// Popup data stores `maps.app.goo.gl` links as bare short codes (no slash)
function getGoogleMapsHref(value: string) {
	if (value.includes('://')) return value;
	if (value.includes('/')) return `https://${value}`;
	return `https://maps.app.goo.gl/${value}`;
}

function getPopupImageSizes(isMobile: boolean): string {
	return isMobile ? '(min-width: 300px) 300px, 80vw' : '(min-width: 350px) 350px, 80vw';
}

function getPopupImageSrcSet(srcSet: string, imageServerUrl: string): string {
	return srcSet
		.split(', ')
		.map((entry) => `${imageServerUrl}${entry}`)
		.join(', ');
}

// Display src is the first (smallest) srcSet candidate, stripped of its width descriptor
function getPopupImageSrc(srcSet: string, imageServerUrl: string): string {
	return `${imageServerUrl}${srcSet.split(', ', 1)[0]?.split(' ', 1)[0] ?? srcSet}`;
}

// Preload a point's popup image once the pointer dwells over it, so it is cached before the popup opens
const mapImagePreloadDelayMs = 100;

// Index by id so hover/selection lookups avoid an O(n) scan per render
function useSourceDataIndex(): Map<string, MapSourceItem> {
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

function useMapImagePreload({ imageServerUrl }: { imageServerUrl: string }) {
	const hoveredId = useMapHoveredId();
	const sourceDataIndex = useSourceDataIndex();
	const { data: inlinePopupData } = usePopupDataQuery();
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

	// Debounce so sweeping a dense cluster doesn't fire a chunk request per point crossed
	const debouncedHoveredId = useDebouncedValue(hoveredId, mapImagePreloadDelayMs);

	// A point carries a chunk key; dwelling on it warms its chunk and preloads its image
	const hoveredSourceItem = debouncedHoveredId
		? sourceDataIndex.get(debouncedHoveredId)
		: undefined;
	const hoverChunkKey = hoveredSourceItem?.properties.chunkKey;
	const { data: hoverChunkData } = useChunkPopup(hoverChunkKey);

	const preloadedRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!hoveredId || hoveredId.startsWith('cluster-')) return;
		if (preloadedRef.current.has(hoveredId)) return;

		const popupSource = hoverChunkKey ? hoverChunkData : inlinePopupData;
		const srcSet = popupSource?.find((item) => item.id === hoveredId)?.image?.srcSet;

		if (!srcSet) return;

		const timer = setTimeout(() => {
			preloadedRef.current.add(hoveredId);

			// Setting srcset/sizes on a detached image runs the same responsive selection as the popup and warms the cache
			const preloadImage = new Image();

			preloadImage.sizes = getPopupImageSizes(isMobile);
			preloadImage.srcset = getPopupImageSrcSet(srcSet, imageServerUrl);
		}, mapImagePreloadDelayMs);

		return () => {
			clearTimeout(timer);
		};
	}, [hoveredId, hoverChunkKey, inlinePopupData, hoverChunkData, imageServerUrl, isMobile]);
}

// Popup data is incomplete; we assemble some props from source data, the rest from chunks fetched on demand
function useMapCanvasPopup() {
	const selectedId = useMapSelectedId();

	const sourceDataIndex = useSourceDataIndex();
	const inlinePopupQuery = usePopupDataQuery();
	const inlinePopupData = inlinePopupQuery.data;

	const selectedSourceItem = selectedId ? sourceDataIndex.get(selectedId) : undefined;

	// A chunk key means the popup comes from a chunk; its absence means an inline popup (objectives/MDX)
	const chunkKey = selectedSourceItem?.properties.chunkKey;
	const chunkQuery = useChunkPopup(chunkKey);

	const isLoading = (chunkKey ? chunkQuery : inlinePopupQuery).isLoading;

	const popupItem = useMemo(() => {
		if (!selectedId) return;

		const popupSource = chunkKey ? chunkQuery.data : inlinePopupData;

		return {
			...defaultPopupItem,
			// Seed the title from source data so a failed chunk fetch degrades to a title-only popup
			...(selectedSourceItem ? { title: selectedSourceItem.properties.title } : {}),
			...popupSource?.find((item) => item.id === selectedId),
			...(selectedSourceItem
				? {
						precision: selectedSourceItem.properties.precision,
						popupCoordinates: getPopupCoordinates(selectedSourceItem),
					}
				: {}),
		} satisfies MapPopupItemExtended;
		// eslint-disable-next-line react-hooks/exhaustive-deps -- selectedSourceItem derives from sourceDataIndex + selectedId
	}, [selectedId, chunkKey, inlinePopupData, chunkQuery.data, sourceDataIndex]);

	return { popupItem, isLoading };
}

const MapPopupContent: FC<{ popupItem: MapPopupItemExtended; imageServerUrl: string }> =
	function MapPopupContent({ popupItem, imageServerUrl }) {
		const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });
		const messages = useMapMessages();

		const {
			title,
			titleMultilingualLang,
			titleMultilingualValue,
			url,
			description,
			precision,
			wikipediaUrl,
			image,
			popupCoordinates,
		} = popupItem;

		const coordinatesString = `${String(popupCoordinates.lat)}, ${String(popupCoordinates.lng)}`;
		const googleMapsUrl = popupItem.googleMapsUrl ?? getGoogleMapsUrlFromGeometry(popupCoordinates);

		return (
			<>
				{image?.srcSet ? (
					<div>
						<img
							className="map-popup-image"
							src={getPopupImageSrc(image.srcSet, imageServerUrl)}
							srcSet={getPopupImageSrcSet(image.srcSet, imageServerUrl)}
							sizes={getPopupImageSizes(isMobile)}
							loading="eager"
							alt={title}
						/>
					</div>
				) : undefined}
				<div className="map-popup-body">
					{titleMultilingualLang && titleMultilingualValue ? (
						<div className="map-popup-title-alt">
							<span lang={titleMultilingualLang}>{titleMultilingualValue}</span>
						</div>
					) : undefined}
					<div className="map-popup-title">
						<a href={url}>{title}</a>
					</div>
					{precision <= 2 ? (
						<div className="map-popup-precision">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 36 36"
								className="map-popup-warning-icon"
							>
								<use href={`#${MapSpritesEnum.Warning}`}></use>
							</svg>
							<span className="map-popup-warning-text">
								{precision === 2 ? messages.precisionWarning : messages.precisionError}
							</span>
						</div>
					) : undefined}
					{description ? (
						<div
							className="map-popup-description"
							dangerouslySetInnerHTML={{ __html: description }}
						/>
					) : undefined}
					<div className="map-popup-footer">
						<div
							className="map-popup-coord"
							onClick={() => {
								void navigator.clipboard.writeText(coordinatesString);
							}}
						>
							<div className="map-popup-coord-text">{coordinatesString}</div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="map-popup-copy-icon"
								viewBox="0 0 24 24"
							>
								<use href={`#${MapSpritesEnum.Copy}`}></use>
							</svg>
						</div>
						<div className="map-popup-links">
							{wikipediaUrl ? (
								<a
									href={
										wikipediaUrl.includes('https://') ? wikipediaUrl : `https://${wikipediaUrl}`
									}
									target="_blank"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										className="map-popup-link-icon map-popup-link-icon-wiki"
									>
										<use href={`#${MapSpritesEnum.Wikipedia}`}></use>
									</svg>
								</a>
							) : undefined}
							{googleMapsUrl ? (
								<a href={getGoogleMapsHref(googleMapsUrl)} target="_blank">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 256 367"
										className="map-popup-link-icon"
									>
										<use href={`#${MapSpritesEnum.Google}`}></use>
									</svg>
								</a>
							) : undefined}
						</div>
					</div>
				</div>
			</>
		);
	};

export const MapPopup: FC<{ imageServerUrl?: string | undefined }> = function MapPopup({
	imageServerUrl = '',
}) {
	const { popupItem, isLoading: isPopupDataLoading } = useMapCanvasPopup();
	const popupVisible = useMapPopupVisible();

	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

	const { setSelectedId } = useMapStoreActions();

	useMapImagePreload({ imageServerUrl });

	const onClose = useCallback(
		function onClose() {
			setSelectedId(undefined);
		},
		[setSelectedId],
	);

	// Note: `closeOnClick` must be false to better control popup display with custom events
	return popupItem ? (
		<Popup
			longitude={popupItem.popupCoordinates.lng}
			latitude={popupItem.popupCoordinates.lat}
			{...(isMobile
				? {
						anchor: 'top',
						offset: 10,
						maxWidth: `calc(min(300px, 80vw))`,
					}
				: {
						anchor: 'left',
						offset: 16,
						maxWidth: `calc(min(350px, 80vw))`,
					})}
			closeOnClick={false}
			onClose={onClose}
			style={{ visibility: popupVisible ? 'visible' : 'hidden' }}
		>
			<div className="map-popup-frame">
				<div className="map-popup-loading">
					<div className="map-loading-animation" style={{ opacity: isPopupDataLoading ? 1 : 0 }} />
				</div>
				<div style={{ opacity: isPopupDataLoading ? 0 : 1 }}>
					{isPopupDataLoading ? undefined : (
						<MapPopupContent
							key={popupItem.id}
							popupItem={popupItem}
							imageServerUrl={imageServerUrl}
						/>
					)}
				</div>
			</div>
		</Popup>
	) : undefined;
};
