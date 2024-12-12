import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '../config/sprites';
import { MAP_FILTER_CONTROL_ID } from '../constants';
import {
	useMapCanvasLoading,
	useMapFilterOpen,
	useMapSourceDataLoading,
	useMapStoreActions,
} from '../store/hooks/use-map-store';

import { CustomControlPortal } from './map-controls-custom';

export const FilterControl = ({ position }: { position: ControlPosition }) => {
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
			>
				<div
					className={`flex h-full w-full items-center justify-center text-primary-700 ${filterOpen ? 'bg-primary-300 hover:bg-primary-200' : ''} ${isLoading ? 'bg-primary-200 opacity-50' : ''}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`h-[20px] text-primary-700 ${filterOpen ? 'mt-[1px] text-primary-600' : ''} ${isLoading ? 'text-primary-600' : ''}`}
						viewBox="0 0 24 24"
					>
						<use xlinkHref={`#${MapSpritesEnum.Filters}`}></use>
					</svg>
				</div>
			</button>
		</CustomControlPortal>
	);
};
