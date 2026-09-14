import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/shared/map';

import { controlSearchId } from '#constants.ts';
import { CustomControlPortal } from '#controls/controls-custom.tsx';
import { usePopupDataQuery } from '#data/data-popup.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useMapMessages } from '#lib/messages.tsx';
import { useIsMapCanvasLoading } from '#store/store.ts';

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
				<label className="map-sr-only" htmlFor="search-control-input">
					{messages.searchAriaLabel}
				</label>
				<input
					className="map-search-input"
					id="search-control-input"
					placeholder={messages.searchPlaceholder}
					required={true}
					type="search"
				/>
				<button
					aria-label={messages.searchAriaLabel}
					className="map-search-button"
					disabled={isLoading}
					id={controlSearchId}
					onClick={() => {
						if (!isLoading) console.log('search');
					}}
				>
					<span className="map-ctrl-icon-frame">
						<svg
							aria-hidden="true"
							className="map-ctrl-icon"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<use href={`#${MapSpritesEnum.Search}`}></use>
						</svg>
					</span>
				</button>
			</div>
		</CustomControlPortal>
	);
};
