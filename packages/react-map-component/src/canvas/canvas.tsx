import type { CSSProperties, FC } from 'react';

import { LngLatBounds } from 'maplibre-gl';
import { memo, useState } from 'react';
import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '#types.ts';

import '#canvas/canvas-worker.ts';
import { CanvasDataProvider } from '#canvas/canvas-data.tsx';
import { useMapCanvasEvents } from '#canvas/canvas-events.ts';
import { MapSelectionFeatureState } from '#canvas/canvas-feature-state.tsx';
import { MapCanvasLoading } from '#canvas/canvas-loading.tsx';
import { MapRootMarker } from '#canvas/canvas-root-marker.tsx';
import { getInitialViewState } from '#canvas/canvas-viewport.ts';
import { MapControls } from '#controls/controls.tsx';
import { ChunkConfigProvider } from '#data/data-popup-chunks.tsx';
import { PopupDataContextProvider } from '#data/data-popup.tsx';
import { SourceDataContextProvider } from '#data/data-source.tsx';
import { MapHostProvider, useMapHost } from '#host/host-context.tsx';
import { useProtomaps } from '#lib/protomaps.ts';
import { MapImagePreload, MapPopup } from '#popup/popup.tsx';
import { mapInteractiveLayerIds } from '#source/source-config.ts';
import { MapSource } from '#source/source.tsx';
import { MapStoreProvider } from '#store/store-provider.tsx';
import { useIsMapCanvasInteractive } from '#store/store.ts';
import { MapTargets } from '#targets/targets.tsx';
import { MapScopeBar } from '#view/view-scope-bar.tsx';
import { MapViewProvider } from '#view/view.tsx';

// Features past the antimeridian only draw with world copies on
function isBeyondAntimeridian(bounds: MapComponentProps['bounds']) {
	if (!bounds) return false;

	const lngLatBounds = LngLatBounds.convert(bounds);

	return lngLatBounds.getWest() < -180 || lngLatBounds.getEast() > 180;
}

const MapCanvasContainer: FC<
	Omit<MapComponentProps, 'apiSourceUrl' | 'isObjectiveFilterEnabled'> & {
		style?: CSSProperties | undefined;
	}
> = function MapCanvasContainer({
	apiChunkBaseUrl,
	apiDivisionUrl,
	apiPopupUrl,
	baseMapTheme,
	bounds,
	center,
	hasEnterControl,
	hash,
	imageServerUrl,
	isDev,
	mapId,
	maxBounds,
	popupData,
	popupDataKey,
	protomapsApiKey,
	style,
	version,
	zoom,
}) {
	const protomapsStyleSpec = useProtomaps({
		baseMapTheme,
		protomapsApiKey,
	});

	const host = useMapHost();

	const canvasEvents = useMapCanvasEvents({ mapId });
	const isCanvasInteractive = useIsMapCanvasInteractive();

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
					<MapControls hasEnterControl={hasEnterControl} />
					<MapPopup imageServerUrl={imageServerUrl} isDev={isDev} />
					<MapImagePreload imageServerUrl={imageServerUrl} isEnabled={!host} />
					<MapCanvasLoading />
				</PopupDataContextProvider>
			</ChunkConfigProvider>
			<MapSource apiDivisionUrl={apiDivisionUrl} bounds={bounds} isDev={isDev} />
			{host ? <MapScopeBar /> : undefined}
			<MapTargets />
			<MapSelectionFeatureState />
			<MapRootMarker />
		</ReactMapGlMap>
	);
};

export const MapCanvas: FC<MapComponentProps> = memo(function MapCanvas(props) {
	const {
		apiSourceUrl,
		host,
		interactive,
		isDev,
		isObjectiveFilterEnabled,
		languages,
		mapFeaturesRule,
		sourceData,
		sourceDataKey,
		targetIds,
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
					...(mapFeaturesRule ? { mapFeaturesRule } : {}),
				}}
			>
				<MapHostProvider host={host}>
					<MapViewProvider isDev={isDev} targetIds={targetIds}>
						<CanvasDataProvider>
							<MapCanvasContainer {...props} />
						</CanvasDataProvider>
					</MapViewProvider>
				</MapHostProvider>
			</MapStoreProvider>
		</SourceDataContextProvider>
	);
});
