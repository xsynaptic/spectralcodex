import type { FC } from 'react';

import {
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	NavigationControl,
	ScaleControl,
} from 'react-map-gl/maplibre';

import { FilterControl } from '#controls/controls-filter.tsx';
import { MetricsControl } from '#controls/controls-metrics.tsx';
import { SearchControl } from '#controls/controls-search.tsx';
import { useIsMapCanvasInteractive } from '#store/store.ts';

const isFeatureSearchControl = false as boolean;

export const MapControls: FC = function MapControls() {
	const isCanvasInteractive = useIsMapCanvasInteractive();

	return (
		<>
			<ScaleControl maxWidth={120} position="bottom-left" />
			<AttributionControl compact={true} position="bottom-right" />
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
