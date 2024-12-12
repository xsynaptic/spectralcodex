import {
	AttributionControl,
	FullscreenControl,
	GeolocateControl,
	NavigationControl,
	ScaleControl,
} from 'react-map-gl/maplibre';

import { useMapCanvasInteractive } from '../store/hooks/use-map-store';

import { FilterControl } from './map-controls-filter';
import { MetricsControl } from './map-controls-metrics';

export const MapControls = () => {
	const canvasInteractive = useMapCanvasInteractive();

	return (
		<>
			<ScaleControl position="bottom-left" maxWidth={120} />
			<AttributionControl position="bottom-right" compact={true} />
			{canvasInteractive ? (
				<>
					<FullscreenControl position="top-left" />
					<GeolocateControl
						position="top-left"
						positionOptions={{ enableHighAccuracy: true }}
						trackUserLocation={true}
					/>
					<NavigationControl position="top-left" showCompass={true} />
					<FilterControl position="top-left" />
					<MetricsControl position="bottom-left" />
				</>
			) : undefined}
		</>
	);
};
