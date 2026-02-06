import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/shared/map';
import { usePopupDataQuery } from 'packages/react-map-component/src/data/data-popup';

import { CONTROL_SEARCH_ID } from '../constants';
import { useSourceDataQuery } from '../data/data-source';
import { translations } from '../lib/translations';
import { useMapCanvasLoading } from '../store/store';
import { CustomControlPortal } from './controls-custom';

export const SearchControl: FC<{ position: ControlPosition }> = function SearchControl({
	position,
}) {
	const isCanvasLoading = useMapCanvasLoading();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();
	const { isLoading: isPopupDataLoading } = usePopupDataQuery();

	const isLoading = isSourceDataLoading || isCanvasLoading || isPopupDataLoading;

	return (
		<CustomControlPortal position={position}>
			<div className="maplibregl-ctrl-search flex items-center gap-1" style={{ width: '300px' }}>
				<label htmlFor="search-control-input" className="sr-only mb-2 p-1 text-sm">
					{translations.searchAriaLabel}
				</label>
				<input
					type="search"
					id="search-control-input"
					className="grow rounded-e-sm p-1 text-sm"
					style={{ outline: '0' }}
					placeholder={translations.searchPlaceholder}
					required={true}
				/>
				<button
					id={CONTROL_SEARCH_ID}
					className="rounded-s-sm"
					disabled={isLoading}
					onClick={() => {
						if (!isLoading) console.log('search');
					}}
					aria-label={translations.searchAriaLabel}
				>
					<span className="flex items-center justify-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							style={{ height: '20px', width: '20px' }}
							aria-hidden="true"
						>
							<use xlinkHref={`#${MapSpritesEnum.Search}`}></use>
						</svg>
					</span>
				</button>
			</div>
		</CustomControlPortal>
	);
};
