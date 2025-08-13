import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/map-types';
import { translations } from 'packages/react-map-component/src/config/translations';

import { MAP_FILTER_CONTROL_ID } from '../constants';
import {
	useMapCanvasLoading,
	useMapFilterOpen,
	useMapSourceDataLoading,
	useMapStoreActions,
} from '../store/hooks/use-map-store';
import { CustomControlPortal } from './map-controls-custom';

export const FilterControl: FC<{ position: ControlPosition }> = ({ position }) => {
	const sourceDataLoading = useMapSourceDataLoading();
	const mapCanvasLoading = useMapCanvasLoading();
	const { setFilterOpen } = useMapStoreActions();

	const filterOpen = useMapFilterOpen();

	const isLoading = sourceDataLoading || mapCanvasLoading;

	return (
		<CustomControlPortal position={position}>
			<button
				id={MAP_FILTER_CONTROL_ID}
				className="overflow-hidden"
				disabled={isLoading}
				onClick={() => {
					if (!isLoading) setFilterOpen(!filterOpen);
				}}
				aria-label={translations.filterMenuAriaLabel}
			>
				<div
					className={`text-primary-700 flex h-full w-full items-center justify-center ${filterOpen ? 'bg-primary-300 hover:bg-primary-200' : ''} ${isLoading ? 'bg-primary-200 opacity-50' : ''}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`text-primary-700 h-[20px] ${filterOpen ? 'text-primary-600 mt-[1px]' : ''} ${isLoading ? 'text-primary-600' : ''}`}
						viewBox="0 0 24 24"
					>
						<use xlinkHref={`#${MapSpritesEnum.Filters}`}></use>
					</svg>
				</div>
			</button>
		</CustomControlPortal>
	);
};
