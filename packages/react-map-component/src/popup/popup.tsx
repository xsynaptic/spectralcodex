import type { LngLat, Popup as MapLibrePopup } from 'maplibre-gl';
import type { FC, MouseEvent, ReactNode } from 'react';

import { useEffect, useRef } from 'react';
import { Popup } from 'react-map-gl/maplibre';

import type { MapPopupItemExtended } from '#popup/popup-hooks.ts';

import { mapControlClassName } from '#constants.ts';
import { useMapLinkClick } from '#host/host-click.ts';
import { getActiveAttribute } from '#lib/active-attribute.ts';
import { useMapConfig } from '#lib/config.tsx';
import { MapIconCopy, MapIconGoogle, MapIconWarning, MapIconWikipedia } from '#lib/icons.tsx';
import { useTrackMap } from '#lib/track-hook.ts';
import {
	getPopupImageSizes,
	getPopupImageSrc,
	getPopupImageSrcSet,
	getTargetPopupItem,
} from '#popup/popup-factory.ts';
import { useMapCanvasPopup, useMapHoverPreload, useMapPopupLayout } from '#popup/popup-hooks.ts';
import { selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

function getGoogleMapsUrlFromGeometry(coordinates: LngLat) {
	const url = new URL('https://www.google.com/maps/search/');

	url.searchParams.set('api', '1');
	url.searchParams.set('query', `${String(coordinates.lat)},${String(coordinates.lng)}`);

	return url.href;
}

async function copyToClipboard(value: string) {
	try {
		await navigator.clipboard.writeText(value);
	} catch {
		console.warn('[Map] Could not copy coordinates!');
	}
}

const MapPopupPrecision: FC<{ precision: number | undefined }> = function MapPopupPrecision({
	precision,
}) {
	const { messages } = useMapConfig();

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

function useMapPopupVisit(url: string) {
	const handleLinkClick = useMapLinkClick(url);
	const trackMap = useTrackMap();

	return (event: MouseEvent<HTMLAnchorElement>) => {
		trackMap({ data: { location: url }, name: 'map-popup-visit' });
		handleLinkClick(event);
	};
}

interface MapPopupHeadingProps {
	title: string;
	titleMultilingualLang: string | undefined;
	titleMultilingualValue: string | undefined;
}

const MapPopupHeadingText: FC<MapPopupHeadingProps> = function MapPopupHeadingText({
	title,
	titleMultilingualLang,
	titleMultilingualValue,
}) {
	return (
		<>
			{titleMultilingualLang && titleMultilingualValue ? (
				<div className="map-popup-title-alt">
					<span lang={titleMultilingualLang}>{titleMultilingualValue}</span>
				</div>
			) : undefined}
			<div className={mapControlClassName.popupTitle}>{title}</div>
		</>
	);
};

const MapPopupHeadingLink: FC<MapPopupHeadingProps & { url: string }> =
	function MapPopupHeadingLink({ url, ...headingProps }) {
		const handleVisit = useMapPopupVisit(url);

		return (
			<a className={mapControlClassName.popupHeading} href={url} onClick={handleVisit}>
				<MapPopupHeadingText {...headingProps} />
			</a>
		);
	};

const MapPopupHeading: FC<MapPopupHeadingProps & { url: string | undefined }> =
	function MapPopupHeading({ url, ...headingProps }) {
		if (url) return <MapPopupHeadingLink {...headingProps} url={url} />;

		return (
			<div className={mapControlClassName.popupHeading}>
				<MapPopupHeadingText {...headingProps} />
			</div>
		);
	};

const MapPopupImageLink: FC<{ children: ReactNode; url: string }> = function MapPopupImageLink({
	children,
	url,
}) {
	const handleVisit = useMapPopupVisit(url);

	return (
		<a aria-hidden={true} href={url} onClick={handleVisit} tabIndex={-1}>
			{children}
		</a>
	);
};

const MapPopupMoreLink: FC<{ title: string; url: string }> = function MapPopupMoreLink({
	title,
	url,
}) {
	const { messages } = useMapConfig();
	const handleVisit = useMapPopupVisit(url);

	return (
		<a className="map-popup-more" href={url} onClick={handleVisit}>
			{messages.popupMoreLabel}
			<span className="map-sr-only">: {title}</span>
		</a>
	);
};

const MapPopupFooter: FC<{
	googleMapsUrl: string | undefined;
	popupCoordinates: LngLat;
	title: string;
	url: string | undefined;
	wikipediaUrl: string | undefined;
}> = function MapPopupFooter({ googleMapsUrl, popupCoordinates, title, url, wikipediaUrl }) {
	const coordinatesString = `${String(popupCoordinates.lat)}, ${String(popupCoordinates.lng)}`;
	const mapsUrl = googleMapsUrl ?? getGoogleMapsUrlFromGeometry(popupCoordinates);
	const { messages } = useMapConfig();

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
						href={wikipediaUrl}
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
					href={mapsUrl}
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
				{url ? <MapPopupMoreLink title={title} url={url} /> : undefined}
			</div>
		</div>
	);
};

interface MapPopupContentProps {
	maxWidthPx: number;
	popupItem: MapPopupItemExtended;
}

const MapPopupContent: FC<MapPopupContentProps> = function MapPopupContent({
	maxWidthPx,
	popupItem,
}) {
	const { imageBaseUrl, messages } = useMapConfig();

	const {
		description,
		popupCoordinates,
		popupImageSources,
		precision,
		title,
		titleMultilingualLang,
		titleMultilingualValue,
		url,
		wikipediaUrl,
	} = popupItem;

	const headingProps = { title, titleMultilingualLang, titleMultilingualValue };
	const image = popupImageSources ? (
		<img
			alt={title}
			className="map-popup-image"
			loading="eager"
			sizes={getPopupImageSizes(maxWidthPx)}
			src={getPopupImageSrc(popupImageSources, imageBaseUrl)}
			srcSet={getPopupImageSrcSet(popupImageSources, imageBaseUrl)}
		/>
	) : undefined;

	return (
		<>
			{image ? (
				<div>{url ? <MapPopupImageLink url={url}>{image}</MapPopupImageLink> : image}</div>
			) : undefined}
			<div className="map-popup-body">
				<MapPopupHeading {...headingProps} url={url} />
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
					title={title}
					url={url}
					wikipediaUrl={wikipediaUrl}
				/>
			</div>
		</>
	);
};

const popupPlacementNarrow = { anchor: 'top', offset: 10 } as const;

const popupPlacementWide = { anchor: 'left', offset: 16 } as const;

function getPopupClassName(isNarrow: boolean, isVisible: boolean) {
	const classNames = [];

	if (isNarrow) classNames.push('map-popup-narrow');
	if (!isVisible) classNames.push('map-popup-hidden');

	return classNames.join(' ');
}

function getPopupPlacement(isNarrow: boolean, isTarget: boolean) {
	const placement = isNarrow ? popupPlacementNarrow : popupPlacementWide;

	// Without an anchor MapLibre opens the popup on whichever side has room
	return isTarget ? { offset: placement.offset } : placement;
}

const MapPopupFrame: FC<{
	isLoading: boolean;
	isTarget: boolean;
	popupItem: MapPopupItemExtended;
}> = function MapPopupFrame({ isLoading, isTarget, popupItem }) {
	const isPopupVisible = useMapStore((state) => state.isPopupVisible);

	const { isNarrow, maxWidthPx } = useMapPopupLayout();
	const popupPlacement = getPopupPlacement(isNarrow, isTarget);

	const { clearSelection } = useMapStore((state) => state.actions);

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

	return (
		<Popup
			latitude={popupItem.popupCoordinates.lat}
			longitude={popupItem.popupCoordinates.lng}
			{...popupPlacement}
			className={getPopupClassName(isNarrow, isPopupVisible)}
			closeOnClick={false}
			maxWidth={`${String(maxWidthPx)}px`}
			onClose={clearSelection}
			ref={popupRef}
		>
			<div className="map-popup-frame" ref={frameRef}>
				<div className="map-popup-loading">
					<div className="map-loading-animation" {...getActiveAttribute(isLoading)} />
				</div>
				<div>
					{isLoading ? undefined : (
						<MapPopupContent
							key={popupItem.id}
							maxWidthPx={maxWidthPx}
							popupItem={isTarget ? getTargetPopupItem(popupItem) : popupItem}
						/>
					)}
				</div>
			</div>
		</Popup>
	);
};

export const MapHoverPreload: FC = function MapHoverPreload() {
	useMapHoverPreload();

	return;
};

export const MapPopup: FC = function MapPopup() {
	const { isLoading, popupItem } = useMapCanvasPopup();
	const targetIds = useMapStore(selectTargetIds);

	if (!popupItem) return;

	return (
		<MapPopupFrame
			isLoading={isLoading}
			isTarget={targetIds.includes(popupItem.id)}
			popupItem={popupItem}
		/>
	);
};
