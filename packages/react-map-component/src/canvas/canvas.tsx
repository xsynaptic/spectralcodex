import type { CSSProperties, FC } from 'react';

import { LngLatBounds } from 'maplibre-gl';
import { memo, useState } from 'react';
import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '#types.ts';

import '#canvas/canvas-worker.ts';
import { CanvasDataProvider } from '#canvas/canvas-data.tsx';
import { useMapCanvasEvents } from '#canvas/canvas-events.ts';
import { MapSelectionFeatureState } from '#canvas/canvas-feature-state.tsx';
import { MapSelectedMarker, MapTargetMarkers } from '#canvas/canvas-markers.tsx';
import { MapPopup } from '#canvas/canvas-popup.tsx';
import { MapRootMarker } from '#canvas/canvas-root-marker.tsx';
import { MapControls } from '#controls/controls.tsx';
import { ChunkConfigProvider } from '#data/data-popup-chunks.tsx';
import { PopupDataContextProvider } from '#data/data-popup.tsx';
import { SourceDataContextProvider, useSourceDataQuery } from '#data/data-source.tsx';
import { useProtomaps } from '#lib/protomaps.ts';
import { mapInteractiveLayerIds } from '#source/source-config.ts';
import { MapSource } from '#source/source.tsx';
import { MapStoreProvider } from '#store/store-provider.tsx';
import { getInitialViewState } from '#store/store-viewport.ts';
import { useIsMapCanvasInteractive, useIsMapCanvasLoading } from '#store/store.ts';

// Features past the antimeridian only draw with world copies on
function isBeyondAntimeridian(bounds: MapComponentProps['bounds']) {
	if (!bounds) return false;

	const lngLatBounds = LngLatBounds.convert(bounds);

	return lngLatBounds.getWest() < -180 || lngLatBounds.getEast() > 180;
}

const MapCanvasLoading: FC<{ loading: boolean }> = function MapCanvasLoading({ loading }) {
	return (
		<div className="map-canvas-loading">
			<div className="map-loading-animation" style={{ opacity: loading ? 1 : 0 }} />
		</div>
	);
};

const MapCanvasContainer: FC<
	Omit<MapComponentProps, 'apiSourceUrl' | 'geodata' | 'isObjectiveFilterEnabled'> & {
		style?: CSSProperties | undefined;
	}
> = function MapCanvasContainer({
	apiChunkBaseUrl,
	apiDivisionUrl,
	apiPopupUrl,
	baseMapTheme,
	bounds,
	center,
	hash,
	imageServerUrl,
	isDev,
	mapId,
	maxBounds,
	popupData,
	popupDataKey,
	protomapsApiKey,
	spritesId,
	spritesUrl,
	style,
	targetIds,
	version,
	zoom,
}) {
	const protomapsStyleSpec = useProtomaps({
		baseMapTheme,
		protomapsApiKey,
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
			attributionControl={false}
			fadeDuration={0}
			hash={hash ?? false}
			initialViewState={initialViewState}
			interactive={isCanvasInteractive}
			interactiveLayerIds={[...mapInteractiveLayerIds]}
			mapStyle={protomapsStyleSpec} // Note: this is the MapLibre GL style spec, not CSS!
			maxZoom={19}
			minZoom={4}
			renderWorldCopies={isBeyondAntimeridian(bounds) || isBeyondAntimeridian(maxBounds)}
			style={{ height: 'auto', ...style }}
			styleDiffing={false}
			{...canvasEvents}
		>
			<ChunkConfigProvider chunkUrlBase={apiChunkBaseUrl} isDev={isDev} version={version}>
				<PopupDataContextProvider
					apiUrl={apiPopupUrl}
					data={popupData}
					dataKey={popupDataKey}
					isDev={isDev}
					version={version}
				>
					<MapControls />
					<MapPopup imageServerUrl={imageServerUrl} isDev={isDev} />
				</PopupDataContextProvider>
			</ChunkConfigProvider>
			<MapSource
				apiDivisionUrl={apiDivisionUrl}
				bounds={bounds}
				hasMapIcons={spritesId !== undefined && spritesUrl !== undefined}
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
		apiSourceUrl,
		interactive,
		isDev,
		isObjectiveFilterEnabled,
		languages,
		scope,
		sourceData,
		sourceDataKey,
		version,
	} = props;

	return (
		<SourceDataContextProvider
			apiUrl={apiSourceUrl}
			data={sourceData}
			dataKey={sourceDataKey}
			isDev={isDev}
			version={version}
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
