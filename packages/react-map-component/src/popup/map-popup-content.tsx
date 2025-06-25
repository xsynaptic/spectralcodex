import { MapSpritesEnum } from '@spectralcodex/map-types';

import { translations } from '../config/translations';
import { MEDIA_QUERY_MOBILE } from '../constants';
import { useMediaQuery } from '../lib/hooks/use-media-query';
import { useMapPopupItem } from '../store/hooks/use-map-store';
import { getGoogleMapsUrlFromGeometry } from './map-popup-utils';

export const MapPopupContent = () => {
	const popupItem = useMapPopupItem();
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

	if (!popupItem) return;

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
						className="bg-fallback aspect-[3/2] w-full object-cover select-none"
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
					<div className="from-accent-500 to-accent-600 bg-gradient-to-b bg-clip-text text-sm leading-snug font-medium text-transparent">
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
