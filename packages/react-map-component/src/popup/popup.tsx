import type { LngLat, Popup as MapLibrePopup } from 'maplibre-gl';
import type { FC } from 'react';

import { useCallback, useEffect, useRef } from 'react';
import { Popup } from 'react-map-gl/maplibre';

import type { MapPopupItemExtended } from '#popup/popup-hooks.ts';

import { MapIconCopy, MapIconGoogle, MapIconWarning, MapIconWikipedia } from '#lib/icons.tsx';
import { useMapMessages } from '#lib/messages.tsx';
import { useTrackMap } from '#lib/track-context.tsx';
import {
	getPopupImageSizes,
	getPopupImageSrc,
	getPopupImageSrcSet,
	getTargetPopupItem,
} from '#popup/popup-factory.ts';
import { useMapImagePreload, useMapPopupLayout } from '#popup/popup-hooks.ts';
import { useMapSelection } from '#popup/popup-selection.ts';
import { useIsMapPopupVisible, useMapStoreActions } from '#store/store.ts';

// Popup data stores `maps.app.goo.gl` links as bare short codes (no slash)
function getGoogleMapsHref(value: string) {
	if (value.includes('://')) return value;
	if (value.includes('/')) return `https://${value}`;
	return `https://maps.app.goo.gl/${value}`;
}

function getGoogleMapsUrlFromGeometry(coordinates: LngLat) {
	const url = new URL('https://www.google.com/maps/search/');

	url.searchParams.set('api', '1');
	url.searchParams.set('query', `${String(coordinates.lat)},${String(coordinates.lng)}`);

	return url.href;
}

function getWikipediaHref(value: string) {
	return value.includes('https://') ? value : `https://${value}`;
}

async function copyToClipboard(value: string) {
	try {
		await navigator.clipboard.writeText(value);
	} catch {
		console.warn('[Map] Could not copy coordinates!');
	}
}

const MapPopupFooter: FC<{
	googleMapsUrl: string | undefined;
	popupCoordinates: LngLat;
	wikipediaUrl: string | undefined;
}> = function MapPopupFooter({ googleMapsUrl, popupCoordinates, wikipediaUrl }) {
	const coordinatesString = `${String(popupCoordinates.lat)}, ${String(popupCoordinates.lng)}`;
	const mapsUrl = googleMapsUrl ?? getGoogleMapsUrlFromGeometry(popupCoordinates);
	const messages = useMapMessages();

	return (
		<div className="map-popup-footer">
			<button
				className="map-popup-coord"
				onClick={() => {
					void copyToClipboard(coordinatesString);
				}}
				type="button"
			>
				<span className="map-popup-coord-text">{coordinatesString}</span>
				<span className="map-sr-only">{messages.copyCoordinatesLabel}</span>
				<svg
					aria-hidden="true"
					className="map-popup-copy-icon"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<MapIconCopy />
				</svg>
			</button>
			<div className="map-popup-links">
				{wikipediaUrl ? (
					<a
						aria-label={messages.wikipediaAriaLabel}
						href={getWikipediaHref(wikipediaUrl)}
						rel="noopener noreferrer"
						target="_blank"
					>
						<svg
							aria-hidden="true"
							className="map-popup-link-icon map-popup-link-icon-wiki"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<MapIconWikipedia />
						</svg>
					</a>
				) : undefined}
				<a
					aria-label={messages.googleMapsAriaLabel}
					href={getGoogleMapsHref(mapsUrl)}
					rel="noopener noreferrer"
					target="_blank"
				>
					<svg
						aria-hidden="true"
						className="map-popup-link-icon"
						viewBox="0 0 256 367"
						xmlns="http://www.w3.org/2000/svg"
					>
						<MapIconGoogle />
					</svg>
				</a>
			</div>
		</div>
	);
};

const MapPopupPrecision: FC<{ precision: number | undefined }> = function MapPopupPrecision({
	precision,
}) {
	const messages = useMapMessages();

	if (precision === undefined || precision > 2) return;

	return (
		<div className="map-popup-precision">
			<svg
				className="map-popup-warning-icon"
				viewBox="0 0 36 36"
				xmlns="http://www.w3.org/2000/svg"
			>
				<MapIconWarning />
			</svg>
			<span className="map-popup-warning-text">
				{precision === 2 ? messages.precisionWarning : messages.precisionError}
			</span>
		</div>
	);
};

const MapPopupTitleText: FC<{ title: string; url: string | undefined }> =
	function MapPopupTitleText({ title, url }) {
		const trackMap = useTrackMap();

		return url ? (
			<a
				href={url}
				onClick={() => {
					trackMap({ data: { location: url }, name: 'map-popup-visit' });
				}}
			>
				{title}
			</a>
		) : (
			<span>{title}</span>
		);
	};

const MapPopupContent: FC<{
	imageServerUrl: string;
	isDev: boolean | undefined;
	popupItem: MapPopupItemExtended;
}> = function MapPopupContent({ imageServerUrl, isDev, popupItem }) {
	const { maxWidthPx } = useMapPopupLayout();
	const messages = useMapMessages();

	const {
		description,
		image,
		objective,
		popupCoordinates,
		precision,
		title,
		titleMultilingualLang,
		titleMultilingualValue,
		url,
		wikipediaUrl,
	} = popupItem;

	return (
		<>
			{image?.srcSet ? (
				<div>
					<img
						alt={title}
						className="map-popup-image"
						loading="eager"
						sizes={getPopupImageSizes(maxWidthPx)}
						src={getPopupImageSrc(image.srcSet, imageServerUrl)}
						srcSet={getPopupImageSrcSet(image.srcSet, imageServerUrl)}
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
					<MapPopupTitleText title={title} url={url} />
					{isDev && objective ? (
						<span className="map-popup-objective">{objective}</span>
					) : undefined}
				</div>
				<MapPopupPrecision precision={precision} />
				{description ? (
					<div
						aria-label={messages.popupDescriptionAriaLabel}
						className="map-popup-description"
						dangerouslySetInnerHTML={{ __html: description }}
						role="region"
						tabIndex={0}
					/>
				) : undefined}
				<MapPopupFooter
					googleMapsUrl={popupItem.googleMapsUrl}
					popupCoordinates={popupCoordinates}
					wikipediaUrl={wikipediaUrl}
				/>
			</div>
		</>
	);
};

const popupPlacementNarrow = { anchor: 'top', offset: 10 } as const;

const popupPlacementWide = { anchor: 'left', offset: 16 } as const;

function getPopupPlacement(isNarrow: boolean, isTarget: boolean) {
	const placement = isNarrow ? popupPlacementNarrow : popupPlacementWide;

	// Without an anchor MapLibre opens the popup on whichever side has room
	return isTarget ? { offset: placement.offset } : placement;
}

const MapPopupFrame: FC<{
	imageServerUrl: string;
	isDev: boolean | undefined;
	isLoading: boolean;
	isTarget: boolean;
	popupItem: MapPopupItemExtended;
}> = function MapPopupFrame({ imageServerUrl, isDev, isLoading, isTarget, popupItem }) {
	const isPopupVisible = useIsMapPopupVisible();

	const { isNarrow, maxWidthPx } = useMapPopupLayout();
	const popupPlacement = getPopupPlacement(isNarrow, isTarget);

	const { setSelectedId } = useMapStoreActions();

	const popupRef = useRef<MapLibrePopup>(null);
	const frameRef = useRef<HTMLDivElement>(null);

	// MapLibre picks the side from the popup's size, so it has to pick again when the content loads and the size changes
	useEffect(() => {
		if (!isTarget || !frameRef.current) return;

		const observer = new ResizeObserver(() => {
			const popup = popupRef.current;

			popup?.setLngLat(popup.getLngLat());
		});

		observer.observe(frameRef.current);

		return () => {
			observer.disconnect();
		};
	}, [isTarget]);

	const onClose = useCallback(
		function onClose() {
			setSelectedId(undefined);
		},
		[setSelectedId],
	);

	// Note: `closeOnClick` must be false to better control popup display with custom events
	return (
		<Popup
			latitude={popupItem.popupCoordinates.lat}
			longitude={popupItem.popupCoordinates.lng}
			{...popupPlacement}
			className={isNarrow ? 'map-popup-narrow' : ''}
			closeOnClick={false}
			maxWidth={`${String(maxWidthPx)}px`}
			onClose={onClose}
			ref={popupRef}
			style={{ visibility: isPopupVisible ? 'visible' : 'hidden' }}
		>
			<div className="map-popup-frame" ref={frameRef}>
				<div className="map-popup-loading">
					<div className="map-loading-animation" style={{ opacity: isLoading ? 1 : 0 }} />
				</div>
				<div style={{ opacity: isLoading ? 0 : 1 }}>
					{isLoading ? undefined : (
						<MapPopupContent
							imageServerUrl={imageServerUrl}
							isDev={isDev}
							key={popupItem.id}
							popupItem={isTarget ? getTargetPopupItem(popupItem) : popupItem}
						/>
					)}
				</div>
			</div>
		</Popup>
	);
};

export const MapImagePreload: FC<{
	imageServerUrl?: string | undefined;
	isEnabled: boolean;
}> = function MapImagePreload({ imageServerUrl = '', isEnabled }) {
	useMapImagePreload({ imageServerUrl, isEnabled });

	return;
};

export const MapPopup: FC<{
	imageServerUrl?: string | undefined;
	isDev?: boolean | undefined;
}> = function MapPopup({ imageServerUrl = '', isDev }) {
	const { isLoading, isTarget, popupItem } = useMapSelection();

	if (!popupItem) return;

	return (
		<MapPopupFrame
			imageServerUrl={imageServerUrl}
			isDev={isDev}
			isLoading={isLoading}
			isTarget={isTarget}
			popupItem={popupItem}
		/>
	);
};
