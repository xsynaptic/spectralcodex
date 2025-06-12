import type { CSSProperties } from 'react';

import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '../types';

import { useMapApiPopupData } from '../api/hooks/use-map-api-popup-data';
import { useMapApiSourceData } from '../api/hooks/use-map-api-source-data';
import { useMapCanvasEvents } from '../canvas/hooks/use-map-canvas-events';
import { MapLayerIdEnum } from '../config/layer';
import {
	useMapCanvasCursor,
	useMapCanvasInteractive,
	useMapCanvasLoading,
} from '../store/hooks/use-map-store';
import { useProtomaps } from './hooks/use-protomaps';
import { MapControls } from './map-controls';
import { MapControlsFilterMenu } from './map-controls-filter-menu';
import { MapLineStringLayer } from './map-layers-line-string';
import { MapPointLayer } from './map-layers-point';
import { MapLoading } from './map-loading';
import { MapPopup } from './map-popup';

const interactiveLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.PointsIcon,
] as const;

export const MapCanvas = ({
	apiSourceUrl,
	apiPopupUrl,
	baseMapTheme,
	bounds,
	maxBounds,
	center,
	hash = false,
	zoom = 12,
	style,
	protomapsApiKey,
	spritesUrl,
	spritesId,
	isDev,
}: Omit<MapComponentProps, 'geodata' | 'cluster' | 'buildId'> & {
	style?: CSSProperties | undefined;
}) => {
	const mapStyle = useProtomaps({
		protomapsApiKey,
		baseMapTheme,
		spritesId,
		spritesUrl,
		isDev,
	});
	const mapCanvasEvents = useMapCanvasEvents();
	const canvasCursor = useMapCanvasCursor();
	const canvasInteractive = useMapCanvasInteractive();
	const canvasLoading = useMapCanvasLoading();

	const { isLoading: sourceDataQueryLoading } = useMapApiSourceData({ apiSourceUrl, isDev });

	useMapApiPopupData({ apiPopupUrl, isDev });

	return (
		<ReactMapGlMap
			initialViewState={{
				...(bounds
					? { bounds }
					: {
							longitude: center?.[0] ?? 0,
							latitude: center?.[1] ?? 0,
						}),
				...(zoom ? { zoom } : {}),
				...(maxBounds ? { maxBounds } : {}),
				fitBoundsOptions: {
					padding: { top: 20, bottom: 20, left: 50, right: 50 },
				},
			}}
			mapStyle={mapStyle} // Note: this is the MapLibre GL style spec, not CSS!
			styleDiffing={false}
			hash={hash}
			interactive={canvasInteractive}
			interactiveLayerIds={[...interactiveLayerIds]}
			maxZoom={18}
			minZoom={4}
			fadeDuration={0}
			renderWorldCopies={false}
			attributionControl={false}
			cursor={canvasInteractive ? canvasCursor : 'auto'}
			style={{ height: 'auto', ...style }}
			{...mapCanvasEvents}
		>
			<MapControls />
			<MapPointLayer hasMapIcons={spritesId !== undefined && spritesUrl !== undefined} />
			<MapLineStringLayer />
			<MapControlsFilterMenu />
			<MapPopup />
			<MapLoading loading={canvasLoading || sourceDataQueryLoading} />
		</ReactMapGlMap>
	);
};
