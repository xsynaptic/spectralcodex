import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { getNumberFormat } from '@spectralcodex/shared/i18n';

import { mapControlClassName } from '#constants.ts';
import { CustomControlPortal } from '#controls/controls-custom.tsx';
import { useMapCanvasData } from '#data/data-canvas.tsx';
import { useMapRows } from '#data/data-query.ts';
import { getActiveAttribute } from '#lib/active-attribute.ts';
import { useMapConfig } from '#lib/config.tsx';

export const MetricsControl: FC<{
	position: ControlPosition;
}> = function MetricsControl({ position }) {
	const { filteredCount, totalCount } = useMapCanvasData();
	const { messages } = useMapConfig();

	const { isLoading: isSourceDataLoading } = useMapRows();

	return (
		<CustomControlPortal className="maplibregl-ctrl" position={position}>
			{isSourceDataLoading ? (
				<div className="map-ctrl-metrics-loading">
					<div className="map-loading-animation" {...getActiveAttribute(isSourceDataLoading)} />
				</div>
			) : (
				<div className={mapControlClassName.metrics} role="status">
					<span>{getNumberFormat('en', undefined).format(filteredCount)}</span>
					<span className="map-ctrl-metrics-divider">/</span>
					<span>
						{getNumberFormat('en', undefined).format(totalCount)}{' '}
						{totalCount === 1 ? messages.point : messages.points}
					</span>
				</div>
			)}
		</CustomControlPortal>
	);
};
