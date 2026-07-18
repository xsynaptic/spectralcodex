import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/shared/map';

import { CONTROL_SEARCH_ID } from '../constants';
import { usePopupDataQuery } from '../data/data-popup';
import { useSourceDataQuery } from '../data/data-source';
import { useMapMessages } from '../lib/messages';
import { useMapCanvasLoading } from '../store/store';
import { CustomControlPortal } from './controls-custom';

export const SearchControl: FC<{ position: ControlPosition }> = function SearchControl({
	position,
}) {
	const isCanvasLoading = useMapCanvasLoading();
	const messages = useMapMessages();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();
	const { isLoading: isPopupDataLoading } = usePopupDataQuery();

	const isLoading = isSourceDataLoading || isCanvasLoading || isPopupDataLoading;

	return (
		<CustomControlPortal position={position}>
			<div
				className="maplibregl-ctrl-search"
				style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '300px' }}
			>
				<label htmlFor="search-control-input" className="map-sr-only">
					{messages.searchAriaLabel}
				</label>
				<input
					type="search"
					id="search-control-input"
					style={{
						flexGrow: 1,
						padding: '0.25rem',
						fontSize: '0.875rem',
						borderStartEndRadius: 'var(--map-radius-sm)',
						borderEndEndRadius: 'var(--map-radius-sm)',
						outline: '0',
					}}
					placeholder={messages.searchPlaceholder}
					required={true}
				/>
				<button
					id={CONTROL_SEARCH_ID}
					style={{
						borderStartStartRadius: 'var(--map-radius-sm)',
						borderEndStartRadius: 'var(--map-radius-sm)',
					}}
					disabled={isLoading}
					onClick={() => {
						if (!isLoading) console.log('search');
					}}
					aria-label={messages.searchAriaLabel}
				>
					<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							style={{ height: '20px', width: '20px' }}
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
