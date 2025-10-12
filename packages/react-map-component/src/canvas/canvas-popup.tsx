import type { LngLat } from 'maplibre-gl';
import type { FC } from 'react';

import { MapSpritesEnum } from '@spectralcodex/map-types';
import { GeometryTypeEnum } from '@spectralcodex/map-types';
import maplibregl from 'maplibre-gl';
import { useCallback } from 'react';
import { useMemo } from 'react';
import { Popup } from 'react-map-gl/maplibre';

import type { MapPopupItemParsed, MapSourceItemParsed } from '../types';

import { MEDIA_QUERY_MOBILE } from '../constants';
import { usePopupDataQuery } from '../data/data-popup';
import { useSourceDataQuery } from '../data/data-source';
import { useMediaQuery } from '../lib/media-query';
import { translations } from '../lib/translations';
import { useMapStoreActions } from '../store/store';
import { useMapSelectedId } from '../store/store';

type MapPopupItemExtended = MapPopupItemParsed & {
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
function getPopupCoordinates({ geometry }: MapSourceItemParsed): maplibregl.LngLat {
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

	return url.toString();
}

// Popup data is incomplete; we need to assemble some props from source data
// Default data is also provided in case of errors and other issues
function useMapCanvasPopup() {
	const selectedId = useMapSelectedId();

	const { data: sourceData } = useSourceDataQuery();
	const { data: popupData } = usePopupDataQuery();

	return useMemo(() => {
		if (!selectedId) return;

		const selectedSourceItem = sourceData?.find(
			(sourceItem) => sourceItem.properties.id === selectedId,
		);

		return {
			...defaultPopupItem,
			...popupData?.find((popupItem) => popupItem.id === selectedId),
			...(selectedSourceItem
				? {
						precision: selectedSourceItem.properties.precision,
						popupCoordinates: getPopupCoordinates(selectedSourceItem),
					}
				: {}),
		} satisfies MapPopupItemExtended;
	}, [selectedId, popupData, sourceData]);
}

const MapPopupContent: FC<{ popupItem: MapPopupItemExtended }> = function MapPopupContent({
	popupItem,
}) {
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

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
			{image ? (
				<div>
					<img
						className="bg-fallback w-full object-cover select-none"
						style={{ aspectRatio: '3/2' }}
						src={image.src}
						srcSet={image.srcSet}
						sizes={isMobile ? '(min-width: 300px) 300px, 80vw' : '(min-width: 350px) 350px, 80vw'}
						loading="eager"
						alt={title}
					/>
				</div>
			) : undefined}
			<div className="flex flex-col px-2 pt-1 pb-2">
				{titleMultilingualLang && titleMultilingualValue ? (
					<div className="from-accent-500 to-accent-600 dark:from-accent-400 dark:to-accent-500 bg-gradient-to-b bg-clip-text text-sm leading-snug font-medium text-transparent">
						<span lang={titleMultilingualLang}>{titleMultilingualValue}</span>
					</div>
				) : undefined}
				<div className="border-b-primary-300 text-primary-800 dark:text-primary-300 dark:border-b-primary-700 border-b pb-1 text-base leading-snug font-semibold">
					<a href={url}>{title}</a>
				</div>
				{precision <= 2 ? (
					<div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 36 36"
							className="text-highlight-500 h-[20px] md:h-[16px]"
						>
							<use xlinkHref={`#${MapSpritesEnum.Warning}`}></use>
						</svg>
						<span className="text-highlight-400 italic">
							{precision === 2 ? translations.precisionWarning : translations.precisionError}
						</span>
					</div>
				) : undefined}
				{description ? (
					<div
						className="mt-1 mb-2 text-sm"
						style={{ maxHeight: '119px', overflowX: 'auto' }}
						dangerouslySetInnerHTML={{ __html: description }}
					/>
				) : undefined}
				<div className="text-primary-700 dark:text-primary-600 m-0 flex justify-between text-xs select-none">
					<div
						className="group flex cursor-pointer items-center gap-1"
						onClick={() => {
							// Copy coordinates to clipboard by clicking on them
							void navigator.clipboard.writeText(coordinatesString);
						}}
					>
						<div className="text-primary-400 dark:text-primary-500 group-hover:text-highlight-300 transition-colors duration-300">
							{coordinatesString}
						</div>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="text-primary-500 dark:text-primary-400 group-hover:text-highlight-400 transition-colors duration-300"
							style={{ height: '14px' }}
							viewBox="0 0 24 24"
						>
							<use xlinkHref={`#${MapSpritesEnum.Copy}`}></use>
						</svg>
					</div>
					<div className="flex gap-2 select-none">
						{wikipediaUrl ? (
							<a
								className="cursor-pointer"
								href={wikipediaUrl.includes('https://') ? wikipediaUrl : `https://${wikipediaUrl}`}
								target="_blank"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									className="dark:text-primary-400 h-[20px] md:h-[16px]"
								>
									<use xlinkHref={`#${MapSpritesEnum.Wikipedia}`}></use>
								</svg>
							</a>
						) : undefined}
						{googleMapsUrl ? (
							<a
								className="cursor-pointer"
								href={
									googleMapsUrl.includes('https://') ? googleMapsUrl : `https://${googleMapsUrl}`
								}
								target="_blank"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 256 367"
									className="h-[20px] md:h-[16px]"
								>
									<use xlinkHref={`#${MapSpritesEnum.Google}`}></use>
								</svg>
							</a>
						) : undefined}
					</div>
				</div>
			</div>
		</>
	);
};

export const MapPopup: FC = function MapPopup() {
	const popupItem = useMapCanvasPopup();

	const { isLoading: isPopupDataLoading } = usePopupDataQuery();

	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

	const { setSelectedId } = useMapStoreActions();

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
		>
			<div className="relative flex flex-col" style={{ minWidth: '200px', minHeight: '80px' }}>
				<div className="p-small pointer-events-none absolute flex h-full w-full justify-center">
					<div
						className="loading-animation transition-opacity duration-500"
						style={{ maxWidth: '100%', opacity: isPopupDataLoading ? 1 : 0 }}
					/>
				</div>
				<div style={{ opacity: isPopupDataLoading ? 0 : 1 }}>
					{isPopupDataLoading ? undefined : (
						<MapPopupContent key={popupItem.id} popupItem={popupItem} />
					)}
				</div>
			</div>
		</Popup>
	) : undefined;
};
