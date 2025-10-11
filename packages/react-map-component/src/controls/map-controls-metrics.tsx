import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { useMapCanvasData } from '../canvas/map-canvas-data';
import { translations } from '../config/translations';
import { useSourceDataQuery } from '../data/map-source-data';
import { CustomControlPortal } from './map-controls-custom';

export const MetricsControl: FC<{
	position: ControlPosition;
}> = function MetricsControl({ position }) {
	const { filteredCount, totalCount } = useMapCanvasData();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const formatNumber = new Intl.NumberFormat('en');

	return (
		<CustomControlPortal position={position} className="maplibregl-ctrl">
			{isSourceDataLoading ? (
				<div className="flex flex-col items-end">
					<div className="loading-animation" style={{ width: '15px' }} />
				</div>
			) : (
				<div className="text-primary-700 dark:text-primary-300 flex flex-nowrap gap-1 font-sans text-xs select-none">
					<span className="drop-shadow-sm">{formatNumber.format(filteredCount)}</span>
					<span className="text-primary-400 dark:text-primary-500 font-light drop-shadow-xs">
						/
					</span>
					<span className="drop-shadow-sm">
						{formatNumber.format(totalCount)} {translations.points}
					</span>
				</div>
			)}
		</CustomControlPortal>
	);
};
