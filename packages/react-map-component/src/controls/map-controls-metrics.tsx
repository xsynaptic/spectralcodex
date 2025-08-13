import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { useMapCanvasData } from '../canvas/hooks/use-map-canvas-data';
import { translations } from '../config/translations';
import { useMapSourceDataCount, useMapSourceDataLoading } from '../store/hooks/use-map-store';
import { CustomControlPortal } from './map-controls-custom';

export const MetricsControl: FC<{ position: ControlPosition }> = ({ position }) => {
	const sourceDataLoading = useMapSourceDataLoading();
	const sourceDataCount = useMapSourceDataCount();
	const { filteredCount } = useMapCanvasData();
	const formatNumber = new Intl.NumberFormat('en');

	return (
		<CustomControlPortal position={position} className="maplibregl-ctrl">
			{sourceDataLoading ? (
				<div className="flex flex-col items-end">
					<div className="loading w-[15px]" />
				</div>
			) : (
				<div className="text-primary-700 dark:text-primary-300 flex flex-nowrap gap-1 font-sans text-xs select-none">
					<span className="drop-shadow-sm">{formatNumber.format(filteredCount)}</span>
					<span className="text-primary-400 dark:text-primary-500 font-light drop-shadow-xs">
						/
					</span>
					<span className="drop-shadow-sm">
						{formatNumber.format(sourceDataCount)} {translations.points}
					</span>
				</div>
			)}
		</CustomControlPortal>
	);
};
