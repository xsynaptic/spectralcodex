import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/shared/map';

import { controlSearchId } from '#constants.ts';
import { usePopupDataQuery } from '#data/data-popup.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useMapMessages } from '#lib/messages.tsx';
import { useIsMapCanvasLoading } from '#store/store.ts';

import { CustomControlPortal } from './controls-custom.tsx';

export const SearchControl: FC<{ position: ControlPosition }> = function SearchControl({
	position,
}) {
	const isCanvasLoading = useIsMapCanvasLoading();
	const messages = useMapMessages();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();
	const { isLoading: isPopupDataLoading } = usePopupDataQuery();

	const isLoading = isSourceDataLoading || isCanvasLoading || isPopupDataLoading;

	return (
		<CustomControlPortal position={position}>
			<div className="maplibregl-ctrl-search map-search">
				<label htmlFor="search-control-input" className="map-sr-only">
					{messages.searchAriaLabel}
				</label>
				<input
					type="search"
					id="search-control-input"
					className="map-search-input"
					placeholder={messages.searchPlaceholder}
					required={true}
				/>
				<button
					id={controlSearchId}
					className="map-search-button"
					disabled={isLoading}
					onClick={() => {
						if (!isLoading) console.log('search');
					}}
					aria-label={messages.searchAriaLabel}
				>
					<span className="map-ctrl-icon-frame">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							className="map-ctrl-icon"
							aria-hidden="true"
						>
							<use href={`#${MapSpritesEnum.Search}`}></use>
						</svg>
					</span>
				</button>
			</div>
		</CustomControlPortal>
	);
};
