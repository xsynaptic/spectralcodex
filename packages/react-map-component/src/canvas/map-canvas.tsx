import type { CSSProperties, FC } from 'react';

import { memo, useMemo } from 'react';
import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '../types';

import { MapLayerIdEnum } from '../config/layer';
import { MapControls } from '../controls/map-controls';
import { MapControlsFilterMenu } from '../controls/map-controls-filter-menu';
import { PopupDataContextProvider } from '../data/map-popup-data';
import { SourceDataContextProvider, useSourceDataQuery } from '../data/map-source-data';
import { useProtomaps } from '../lib/protomaps';
import { MapSource } from '../source/map-source';
import {
	useMapCanvasCursor,
	useMapCanvasInteractive,
	useMapCanvasLoading,
} from '../store/map-store';
import { MapStoreProvider } from '../store/map-store-provider';
import { useMapCanvasEvents } from './map-canvas-events';
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
	Omit<MapComponentProps, 'geodata' | 'cluster' | 'showObjectiveFilter' | 'apiSourceUrl'> & {
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
	apiPopupUrl,
	popupData,
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

	const loading = useMemo(
		() => canvasLoading || isSourceDataLoading,
		[canvasLoading, isSourceDataLoading],
	);

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
			<PopupDataContextProvider apiPopupUrl={apiPopupUrl} popupData={popupData} isDev={isDev}>
				<MapPopup />
			</PopupDataContextProvider>
			<MapCanvasLoading loading={loading} />
		</ReactMapGlMap>
	);
};

export const MapCanvas: FC<MapComponentProps & { style: CSSProperties }> = memo(
	function MapCanvas(props) {
		const {
			cluster,
			interactive,
			showObjectiveFilter,
			apiSourceUrl,
			sourceData,
			languages,
			isDev,
		} = props;

		return (
			<SourceDataContextProvider apiSourceUrl={apiSourceUrl} sourceData={sourceData} isDev={isDev}>
				<MapStoreProvider
					initialState={{
						...(cluster ? { canvasClusters: cluster } : {}),
						...(showObjectiveFilter ? { showObjectiveFilter: true } : {}),
						...(interactive === false ? { canvasInteractive: false } : {}),
						...(languages ? { languages } : {}),
					}}
				>
					<MapCanvasContainer {...props} />
				</MapStoreProvider>
			</SourceDataContextProvider>
		);
	},
);
