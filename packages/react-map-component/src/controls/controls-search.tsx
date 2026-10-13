import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { useId } from 'react';

import { controlSearchId } from '#constants.ts';
import { CustomControlPortal } from '#controls/controls-custom.tsx';
import { usePopupDataQuery } from '#data/data-popup.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { MapIconSearch } from '#lib/icons.tsx';
import { useMapMessages } from '#lib/messages.tsx';
import { useIsMapCanvasLoading } from '#store/store.ts';

export const SearchControl: FC<{ position: ControlPosition }> = function SearchControl({
	position,
}) {
	const isCanvasLoading = useIsMapCanvasLoading();
	const messages = useMapMessages();
	const inputId = useId();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();
	const { isLoading: isPopupDataLoading } = usePopupDataQuery();

	const isLoading = isSourceDataLoading || isCanvasLoading || isPopupDataLoading;

	return (
		<CustomControlPortal position={position}>
			<div className="maplibregl-ctrl-search map-search">
				<label className="map-sr-only" htmlFor={inputId}>
					{messages.searchAriaLabel}
				</label>
				<input
					className="map-search-input"
					id={inputId}
					placeholder={messages.searchPlaceholder}
					required={true}
					type="search"
				/>
				<button
					aria-label={messages.searchAriaLabel}
					className="map-search-button"
					disabled={isLoading}
					id={controlSearchId}
				>
					<span className="map-ctrl-icon-frame">
						<svg
							aria-hidden="true"
							className="map-ctrl-icon"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<MapIconSearch />
						</svg>
					</span>
				</button>
			</div>
		</CustomControlPortal>
	);
};
