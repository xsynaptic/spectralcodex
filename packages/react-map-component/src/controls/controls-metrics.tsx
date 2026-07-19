import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { useMapCanvasData } from '../canvas/canvas-data';
import { useSourceDataQuery } from '../data/data-source';
import { useMapMessages } from '../lib/messages';
import { CustomControlPortal } from './controls-custom';

const formatNumber = new Intl.NumberFormat('en');

export const MetricsControl: FC<{
	position: ControlPosition;
}> = function MetricsControl({ position }) {
	const { filteredCount, totalCount } = useMapCanvasData();
	const messages = useMapMessages();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	// Note: the class name is specified to remove the white background and border added by default
	return (
		<CustomControlPortal className="maplibregl-ctrl" position={position}>
			{isSourceDataLoading ? (
				<div className="maplibregl-ctrl-metrics-loading">
					<div className="map-loading-animation" />
				</div>
			) : (
				<div className="maplibregl-ctrl-metrics">
					<span>{formatNumber.format(filteredCount)}</span>
					<span className="maplibregl-ctrl-metrics-divider">/</span>
					<span>
						{formatNumber.format(totalCount)} {messages.points}
					</span>
				</div>
			)}
		</CustomControlPortal>
	);
};
