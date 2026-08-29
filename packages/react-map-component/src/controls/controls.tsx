import type { FC } from 'react';

import {
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	NavigationControl,
	ScaleControl,
} from 'react-map-gl/maplibre';

import { useIsMapCanvasInteractive } from '../store/store';
import { FilterControl } from './controls-filter';
import { MetricsControl } from './controls-metrics';
import { SearchControl } from './controls-search';

const isFeatureSearchControl = false as boolean;

export const MapControls: FC = function MapControls() {
	const isCanvasInteractive = useIsMapCanvasInteractive();

	return (
		<>
			<ScaleControl position="bottom-left" maxWidth={120} />
			<AttributionControl position="bottom-right" compact={true} />
			{isCanvasInteractive ? (
				<>
					<FullscreenControl position="top-left" />
					<GeolocateControl
						position="top-left"
						positionOptions={{ enableHighAccuracy: true }}
						trackUserLocation={true}
					/>
					<NavigationControl position="top-left" showCompass={true} />
					<FilterControl position="top-left" />
					{isFeatureSearchControl ? <SearchControl position="top-right" /> : undefined}
					<MetricsControl position="bottom-left" />
				</>
			) : undefined}
		</>
	);
};
