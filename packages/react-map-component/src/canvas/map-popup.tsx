import { MapSpritesEnum } from '@spectralcodex/map-types';
import { memo } from 'react';
import { Popup } from 'react-map-gl/maplibre';

import type { MapPopupItem } from '../types';

import { translations } from '../config/translations';
import { MEDIA_QUERY_MOBILE } from '../constants';
import { useMediaQuery } from '../lib/hooks/use-media-query';
import {
	useMapPopupDataLoading,
	useMapPopupItem,
	useMapStoreActions,
} from '../store/hooks/use-map-store';

interface PopupCoordinates {
	lng: number;
	lat: number;
}

// Currently this handles Point and LineString geometry without complicated types
const sanitizeCoordinates = (feature: MapPopupItem): PopupCoordinates => {
	if (
		typeof feature.geometry.coordinates[0] === 'number' &&
		typeof feature.geometry.coordinates[1] === 'number'
	) {
		return {
			lng: feature.geometry.coordinates[0],
			lat: feature.geometry.coordinates[1],
		};
	}

	if (Array.isArray(feature.geometry.coordinates[0])) {
		return {
			lng: feature.geometry.coordinates[0][0],
			lat: feature.geometry.coordinates[0][1],
		};
	}

	return { lng: 0, lat: 0 };
};

// Generate a standard Google Maps URL from a set of coordinates
function getGoogleMapsUrlFromGeometry(coordinates: PopupCoordinates) {
	const url = new URL('https://www.google.com/maps/search/');

	url.searchParams.set('api', '1');
	url.searchParams.set('query', `${String(coordinates.lat)},${String(coordinates.lng)}`);

	return url.toString();
}

export const MapPopup = memo(function MapPopup() {
	const popupDataLoading = useMapPopupDataLoading();
	const popupItem = useMapPopupItem();
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

	const { setSelectedId } = useMapStoreActions();

	if (!popupItem) return;

	const { title, titleAlt, url, description, precision, wikipediaUrl, image } = popupItem;

	const coordinates = sanitizeCoordinates(popupItem);
	const coordinatesString = `${String(coordinates.lat)}, ${String(coordinates.lng)}`;
	const googleMapsUrl = popupItem.googleMapsUrl ?? getGoogleMapsUrlFromGeometry(coordinates);

	// Note: `closeOnClick` must be false to better control popup display with custom events
	return (
		<Popup
			longitude={coordinates.lng}
			latitude={coordinates.lat}
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
			onClose={() => {
				// This fires when the user clicks on the close button
				setSelectedId(undefined);
			}}
		>
			<div className="relative flex min-h-[80px] min-w-[200px] flex-col">
				<div className="p-small pointer-events-none absolute flex h-full w-full justify-center">
					<div
						className="loading max-w-[100%] transition-opacity duration-500"
						style={{ opacity: popupDataLoading ? 1 : 0 }}
					/>
				</div>
				{popupDataLoading ? undefined : (
					<>
						{' '}
						{image ? (
							<div>
								<img
									className="bg-fallback aspect-[3/2] w-full object-cover select-none"
									src={image.src}
									srcSet={image.srcSet}
									sizes={
										isMobile ? '(min-width: 300px) 300px, 80vw' : '(min-width: 350px) 350px, 80vw'
									}
									loading="eager"
									alt={title}
								/>
							</div>
						) : undefined}
						<div className="flex flex-col px-2 pt-1 pb-2">
							{titleAlt ? (
								<div className="from-accent-500 to-accent-600 bg-gradient-to-b bg-clip-text text-sm leading-snug font-medium text-transparent">
									{titleAlt}
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
										className="text-highlight-500 w-[20px] md:w-[20px]"
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
									className="mt-1 mb-2 max-h-[126px] overflow-x-auto text-sm"
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
									<div className="text-primary-400 group-hover:text-highlight-300 transition-colors duration-300">
										{coordinatesString}
									</div>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="text-primary-500 group-hover:text-highlight-400 h-[14px] transition-colors duration-300"
										viewBox="0 0 24 24"
									>
										<use xlinkHref={`#${MapSpritesEnum.Copy}`}></use>
									</svg>
								</div>
								<div className="flex gap-2 select-none">
									{wikipediaUrl ? (
										<a className="cursor-pointer" href={wikipediaUrl} target="_blank">
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
										<a className="cursor-pointer" href={googleMapsUrl} target="_blank">
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
				)}
			</div>
		</Popup>
	);
});
