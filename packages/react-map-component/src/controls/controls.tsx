import type { FC } from 'react';

import {
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	NavigationControl,
	ScaleControl,
} from 'react-map-gl/maplibre';

import { FilterControl } from '#controls/controls-filter.tsx';
import { HostControl } from '#controls/controls-host.tsx';
import { MetricsControl } from '#controls/controls-metrics.tsx';
import { useMapConfig } from '#lib/config.tsx';

export const MapControls: FC = function MapControls() {
	const { host, isInteractive } = useMapConfig();

	return (
		<>
			<ScaleControl maxWidth={120} position="bottom-left" />
			<AttributionControl compact={true} position="bottom-right" />
			{isInteractive ? (
				<>
					<FullscreenControl
						position="top-left"
						{...(host.fullscreenContainerId ? { containerId: host.fullscreenContainerId } : {})}
					/>
					<GeolocateControl
						position="top-left"
						positionOptions={{ enableHighAccuracy: true }}
						trackUserLocation={true}
					/>
					<NavigationControl position="top-left" showCompass={true} />
					<FilterControl position="top-left" />
					{host.controls.map((name) => (
						<HostControl key={name} name={name} position="top-right" />
					))}
					<MetricsControl position="bottom-left" />
				</>
			) : undefined}
		</>
	);
};
