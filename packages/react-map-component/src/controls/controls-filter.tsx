import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/map-types';

import { CONTROL_FILTER_ID } from '../constants';
import { useSourceDataQuery } from '../data/data-source';
import { translations } from '../lib/translations';
import { useMapCanvasLoading, useMapFilterOpen, useMapStoreActions } from '../store/store';
import { CustomControlPortal } from './controls-custom';

export const FilterControl: FC<{ position: ControlPosition }> = function FilterControl({
	position,
}) {
	const isCanvasLoading = useMapCanvasLoading();
	const filterOpen = useMapFilterOpen();

	const { setFilterOpen } = useMapStoreActions();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isLoading = isSourceDataLoading || isCanvasLoading;

	return (
		<CustomControlPortal position={position}>
			<button
				id={CONTROL_FILTER_ID}
				disabled={isLoading}
				onClick={() => {
					if (!isLoading) setFilterOpen(!filterOpen);
				}}
				style={{ overflow: 'hidden' }}
				aria-label={translations.filterMenuAriaLabel}
			>
				<div
					className={`text-primary-700 flex h-full w-full items-center justify-center ${filterOpen ? 'bg-primary-300 hover:bg-primary-200' : ''} ${isLoading ? 'bg-primary-200 opacity-50' : ''}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={isLoading ? 'text-primary-600' : 'text-primary-700'}
						style={{ height: '20px', ...(filterOpen ? { marginTop: '1px' } : {}) }}
						viewBox="0 0 24 24"
					>
						<use xlinkHref={`#${MapSpritesEnum.Filters}`}></use>
					</svg>
				</div>
			</button>
		</CustomControlPortal>
	);
};
