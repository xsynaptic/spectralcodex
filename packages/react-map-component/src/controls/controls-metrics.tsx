import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { mapControlClassName } from '#constants.ts';
import { CustomControlPortal } from '#controls/controls-custom.tsx';
import { useMapCanvasData } from '#data/data-canvas.tsx';
import { useMapRows } from '#data/data-query.ts';
import { useMapConfig } from '#lib/config.tsx';

const formatNumber = new Intl.NumberFormat('en');

export const MetricsControl: FC<{
	position: ControlPosition;
}> = function MetricsControl({ position }) {
	const { filteredCount, totalCount } = useMapCanvasData();
	const { messages } = useMapConfig();

	const { isLoading: isSourceDataLoading } = useMapRows();

	return (
		<CustomControlPortal className="maplibregl-ctrl" position={position}>
			{isSourceDataLoading ? (
				<div className="maplibregl-ctrl-metrics-loading">
					<div className="map-loading-animation" />
				</div>
			) : (
				<div className={mapControlClassName.metrics} role="status">
					<span>{formatNumber.format(filteredCount)}</span>
					<span className="maplibregl-ctrl-metrics-divider">/</span>
					<span>
						{formatNumber.format(totalCount)} {totalCount === 1 ? messages.point : messages.points}
					</span>
				</div>
			)}
		</CustomControlPortal>
	);
};
