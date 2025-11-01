import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { useMapCanvasData } from '../canvas/canvas-data';
import { useSourceDataQuery } from '../data/data-source';
import { translations } from '../lib/translations';
import { CustomControlPortal } from './controls-custom';

export const MetricsControl: FC<{
	position: ControlPosition;
}> = function MetricsControl({ position }) {
	const { filteredCount, totalCount } = useMapCanvasData();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const formatNumber = new Intl.NumberFormat('en');

	// Note: the class name is specified to remove the white background and border added by default
	return (
		<CustomControlPortal className="maplibregl-ctrl" position={position}>
			{isSourceDataLoading ? (
				<div className="flex flex-col items-end">
					<div className="loading-animation" style={{ width: '15px' }} />
				</div>
			) : (
				<div className="maplibregl-ctrl-metrics text-primary-700 dark:text-primary-300 flex flex-nowrap gap-1 font-sans text-xs select-none">
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
