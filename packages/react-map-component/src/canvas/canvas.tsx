import type { CSSProperties, FC } from 'react';

import { memo, useState } from 'react';
import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '../types';

import './canvas-worker';
import { MapControls } from '../controls/controls';
import { PopupDataContextProvider } from '../data/data-popup';
import { ChunkConfigProvider } from '../data/data-popup-chunks';
import { SourceDataContextProvider, useSourceDataQuery } from '../data/data-source';
import { useProtomaps } from '../lib/protomaps';
import { MapSource } from '../source/source';
import { mapInteractiveLayerIds } from '../source/source-config';
import { useIsMapCanvasInteractive, useIsMapCanvasLoading } from '../store/store';
import { MapStoreProvider } from '../store/store-provider';
import { getInitialViewState } from '../store/store-viewport';
import { CanvasDataProvider } from './canvas-data';
import { useMapCanvasEvents } from './canvas-events';
import { MapSelectionFeatureState } from './canvas-feature-state';
import { MapSelectedMarker, MapTargetMarkers } from './canvas-markers';
import { MapPopup } from './canvas-popup';
import { MapRootMarker } from './canvas-root-marker';

const MapCanvasLoading: FC<{ loading: boolean }> = function MapCanvasLoading({ loading }) {
	return (
		<div className="map-canvas-loading">
			<div className="map-loading-animation" style={{ opacity: loading ? 1 : 0 }} />
		</div>
	);
};

const MapCanvasContainer: FC<
	Omit<MapComponentProps, 'geodata' | 'isObjectiveFilterEnabled' | 'apiSourceUrl'> & {
		style?: CSSProperties | undefined;
	}
> = function MapCanvasContainer({
	apiDivisionUrl,
	baseMapTheme,
	bounds,
	maxBounds,
	center,
	hash,
	zoom,
	style,
	protomapsApiKey,
	mapId,
	imageServerUrl,
	spritesUrl,
	spritesId,
	apiPopupUrl,
	popupData,
	popupDataKey,
	apiChunkBaseUrl,
	targetIds,
	version,
	isDev,
}) {
	const protomapsStyleSpec = useProtomaps({
		protomapsApiKey,
		baseMapTheme,
		spritesId,
		spritesUrl,
	});

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const canvasEvents = useMapCanvasEvents({ mapId });
	const isCanvasInteractive = useIsMapCanvasInteractive();
	const isCanvasLoading = useIsMapCanvasLoading();

	const [initialViewState] = useState(() =>
		getInitialViewState({ bounds, center, mapId, maxBounds, zoom }),
	);

	return (
		<ReactMapGlMap
			initialViewState={initialViewState}
			mapStyle={protomapsStyleSpec} // Note: this is the MapLibre GL style spec, not CSS!
			styleDiffing={false}
			hash={hash ?? false}
			interactive={isCanvasInteractive}
			interactiveLayerIds={[...mapInteractiveLayerIds]}
			maxZoom={19}
			minZoom={4}
			fadeDuration={0}
			renderWorldCopies={false}
			attributionControl={false}
			style={{ height: 'auto', ...style }}
			{...canvasEvents}
		>
			<ChunkConfigProvider chunkUrlBase={apiChunkBaseUrl} version={version} isDev={isDev}>
				<PopupDataContextProvider
					apiUrl={apiPopupUrl}
					data={popupData}
					dataKey={popupDataKey}
					version={version}
					isDev={isDev}
				>
					<MapControls />
					<MapPopup imageServerUrl={imageServerUrl} />
				</PopupDataContextProvider>
			</ChunkConfigProvider>
			<MapSource
				apiDivisionUrl={apiDivisionUrl}
				hasMapIcons={spritesId !== undefined && spritesUrl !== undefined}
				bounds={bounds}
				isDev={isDev}
				targetIds={targetIds}
			/>
			{targetIds ? <MapTargetMarkers targetIds={targetIds} /> : undefined}
			<MapSelectedMarker targetIds={targetIds} />
			<MapSelectionFeatureState />
			<MapRootMarker />
			<MapCanvasLoading loading={isCanvasLoading || isSourceDataLoading} />
		</ReactMapGlMap>
	);
};

export const MapCanvas: FC<MapComponentProps> = memo(function MapCanvas(props) {
	const {
		interactive,
		isObjectiveFilterEnabled,
		apiSourceUrl,
		sourceData,
		sourceDataKey,
		scope,
		languages,
		version,
		isDev,
	} = props;

	return (
		<SourceDataContextProvider
			apiUrl={apiSourceUrl}
			data={sourceData}
			dataKey={sourceDataKey}
			version={version}
			isDev={isDev}
		>
			<MapStoreProvider
				initialState={{
					...(isObjectiveFilterEnabled ? { isObjectiveFilterEnabled: true } : {}),
					...(interactive === false ? { isCanvasInteractive: false } : {}),
					...(languages ? { languages } : {}),
					...(scope ? { scope } : {}),
				}}
			>
				<CanvasDataProvider>
					<MapCanvasContainer {...props} />
				</CanvasDataProvider>
			</MapStoreProvider>
		</SourceDataContextProvider>
	);
});
