import type { CSSProperties, FC } from 'react';

import { memo } from 'react';
import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '../types';

import { PopupDataContextProvider } from '../api/hooks/use-map-api-popup-data';
import {
	SourceDataContextProvider,
	useSourceDataQuery,
} from '../api/hooks/use-map-api-source-data';
import { useMapCanvasEvents } from '../canvas/hooks/use-map-canvas-events';
import { MapLayerIdEnum } from '../config/layer';
import { MapControls } from '../controls/map-controls';
import { MapControlsFilterMenu } from '../controls/map-controls-filter-menu';
import { useProtomaps } from '../lib/hooks/use-protomaps';
import { MapSource } from '../source/map-source';
import {
	useMapCanvasCursor,
	useMapCanvasInteractive,
	useMapCanvasLoading,
} from '../store/hooks/use-map-store';
import { MapStoreProvider } from '../store/map-store-provider';
import { MapPopup } from './map-popup';

// Layers where pointer events are triggered (whether in interactive mode or not)
// All other layers do not trigger pointer events
const interactiveLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsImage,
] as const;

const MapCanvasLoading: FC<{ loading: boolean }> = function MapCanvasLoading({ loading }) {
	return (
		<div className="flex h-full justify-center">
			<div
				className="loading-animation transition-opacity duration-500"
				style={{ width: '20%', opacity: loading ? 1 : 0 }}
			/>
		</div>
	);
};

const MapCanvasContainer: FC<
	Omit<
		MapComponentProps,
		'geodata' | 'cluster' | 'showObjectiveFilter' | 'apiSourceUrl' | 'apiPopupUrl'
	> & {
		style?: CSSProperties | undefined;
	}
> = function MapCanvasContainer({
	apiDivisionUrl,
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
}) {
	const mapStyle = useProtomaps({
		protomapsApiKey,
		baseMapTheme,
		spritesId,
		spritesUrl,
		isDev,
	});

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const mapCanvasEvents = useMapCanvasEvents();
	const canvasCursor = useMapCanvasCursor();
	const canvasInteractive = useMapCanvasInteractive();
	const canvasLoading = useMapCanvasLoading();

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
			<MapCanvasLoading loading={canvasLoading || isSourceDataLoading} />
		</ReactMapGlMap>
	);
};

export const MapCanvas: FC<MapComponentProps & { style: CSSProperties }> = memo(function MapCanvas({
	cluster,
	showObjectiveFilter,
	apiSourceUrl,
	apiPopupUrl,
	sourceData,
	popupData,
	languages,
	...props
}) {
	return (
		<SourceDataContextProvider
			apiSourceUrl={apiSourceUrl}
			sourceData={sourceData}
			isDev={props.isDev}
		>
			<PopupDataContextProvider apiPopupUrl={apiPopupUrl} popupData={popupData} isDev={props.isDev}>
				<MapStoreProvider
					initialState={{
						...(cluster ? { canvasClusters: cluster } : {}),
						...(showObjectiveFilter ? { showObjectiveFilter: true } : {}),
						...(props.interactive === false ? { canvasInteractive: false } : {}),
						...(languages ? { languages } : {}),
					}}
				>
					<MapCanvasContainer {...props} />
				</MapStoreProvider>
			</PopupDataContextProvider>
		</SourceDataContextProvider>
	);
});
