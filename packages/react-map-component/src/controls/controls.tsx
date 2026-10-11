import type { FC } from 'react';

import {
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	NavigationControl,
	ScaleControl,
} from 'react-map-gl/maplibre';

import type { MapComponentProps } from '#types.ts';

import { mapExitEventName } from '#constants.ts';
import { ExitControl } from '#controls/controls-exit.tsx';
import { FilterControl } from '#controls/controls-filter.tsx';
import { MetricsControl } from '#controls/controls-metrics.tsx';
import { SearchControl } from '#controls/controls-search.tsx';
import { useIsMapCanvasInteractive } from '#store/store.ts';

const isFeatureSearchControl = false as boolean;

export const MapControls: FC<Pick<MapComponentProps, 'host'>> = function MapControls({ host }) {
	const isCanvasInteractive = useIsMapCanvasInteractive();

	return (
		<>
			<ScaleControl maxWidth={120} position="bottom-left" />
			<AttributionControl compact={true} position="bottom-right" />
			{isCanvasInteractive ? (
				<>
					{host ? (
						<ExitControl eventName={mapExitEventName} position="top-left" />
					) : (
						<FullscreenControl position="top-left" />
					)}
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
