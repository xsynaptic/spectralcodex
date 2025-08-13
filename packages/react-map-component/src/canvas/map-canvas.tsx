import type { CSSProperties, FC } from 'react';

import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '../types';

import { useMapApiPopupData } from '../api/hooks/use-map-api-popup-data';
import { useMapApiSourceData } from '../api/hooks/use-map-api-source-data';
import { useMapCanvasEvents } from '../canvas/hooks/use-map-canvas-events';
import { MapLayerIdEnum } from '../config/layer';
import { MapControls } from '../controls/map-controls';
import { MapControlsFilterMenu } from '../controls/map-controls-filter-menu';
import { useProtomaps } from '../lib/hooks/use-protomaps';
import { MapPopup } from '../popup/map-popup';
import { MapSource } from '../source/map-source';
import {
	useMapCanvasCursor,
	useMapCanvasInteractive,
	useMapCanvasLoading,
} from '../store/hooks/use-map-store';
import { MapCanvasLoading } from './map-canvas-loading';

// Layers where pointer events are triggered (whether in interactive mode or not)
// All other layers do not trigger pointer events
const interactiveLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsImage,
] as const;

export const MapCanvas: FC<
	Omit<MapComponentProps, 'geodata' | 'cluster'> & {
		style?: CSSProperties | undefined;
	}
> = ({
	apiSourceUrl,
	apiDivisionUrl,
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
			maxZoom={19}
			minZoom={4}
			fadeDuration={0}
			renderWorldCopies={false}
			attributionControl={false}
			cursor={canvasInteractive ? canvasCursor : 'auto'}
			style={{ height: 'auto', ...style }}
			{...mapCanvasEvents}
		>
			<MapControls />
			<MapSource
				apiDivisionUrl={apiDivisionUrl}
				hasMapIcons={spritesId !== undefined && spritesUrl !== undefined}
				bounds={bounds}
				isDev={isDev}
			/>
			<MapControlsFilterMenu />
			<MapPopup />
			<MapCanvasLoading loading={canvasLoading || sourceDataQueryLoading} />
		</ReactMapGlMap>
	);
};
