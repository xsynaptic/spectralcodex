import type { CSSProperties, FC } from 'react';

import { memo, useState } from 'react';
import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps, MapInitialViewState } from '../types';

import { MapControls } from '../controls/controls';
import { PopupDataContextProvider } from '../data/data-popup';
import { SourceDataContextProvider, useSourceDataQuery } from '../data/data-source';
import { useProtomaps } from '../lib/protomaps';
import { MapSource } from '../source/source';
import { MapLayerIdEnum } from '../source/source-config';
import { useMapCanvasCursor, useMapCanvasInteractive, useMapCanvasLoading } from '../store/store';
import { MapStoreProvider } from '../store/store-provider';
import { readSavedViewport } from '../store/store-viewport';
import { useMapCanvasEvents } from './canvas-events';
import { MapPopup } from './canvas-popup';

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
	Omit<MapComponentProps, 'geodata' | 'showObjectiveFilter' | 'apiSourceUrl'> & {
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
	spritesUrl,
	spritesId,
	apiPopupUrl,
	popupData,
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
	const canvasCursor = useMapCanvasCursor();
	const canvasInteractive = useMapCanvasInteractive();
	const canvasLoading = useMapCanvasLoading();

	const [initialViewState] = useState(() => {
		const saved = readSavedViewport(mapId);

		if (saved) {
			return {
				...(maxBounds ? { maxBounds } : {}),
				...saved,
			} satisfies MapInitialViewState;
		}

		const viewState = {
			...(maxBounds ? { maxBounds } : {}),
			fitBoundsOptions: {
				padding: { top: 20, bottom: 20, left: 50, right: 50 },
			},
		};

		if (bounds) {
			return {
				...viewState,
				bounds,
				zoom: zoom ?? 12,
			} satisfies MapInitialViewState;
		}

		return {
			...viewState,
			longitude: center?.[0] ?? 0,
			latitude: center?.[1] ?? 0,
			zoom: zoom ?? 12,
		} satisfies MapInitialViewState;
	});

	return (
		<ReactMapGlMap
			initialViewState={initialViewState}
			mapStyle={protomapsStyleSpec} // Note: this is the MapLibre GL style spec, not CSS!
			styleDiffing={false}
			hash={hash ?? false}
			interactive={canvasInteractive}
			interactiveLayerIds={[...interactiveLayerIds]}
			maxZoom={19}
			minZoom={4}
			fadeDuration={0}
			renderWorldCopies={false}
			attributionControl={false}
			cursor={canvasInteractive ? canvasCursor : 'auto'}
			style={{ height: 'auto', ...style }}
			{...canvasEvents}
		>
			<PopupDataContextProvider
				apiPopupUrl={apiPopupUrl}
				popupData={popupData}
				version={version}
				isDev={isDev}
			>
				<MapControls />
				<MapPopup />
			</PopupDataContextProvider>
			<MapSource
				apiDivisionUrl={apiDivisionUrl}
				hasMapIcons={spritesId !== undefined && spritesUrl !== undefined}
				bounds={bounds}
				isDev={isDev}
			/>
			<MapCanvasLoading loading={canvasLoading || isSourceDataLoading} />
		</ReactMapGlMap>
	);
};

export const MapCanvas: FC<MapComponentProps> = memo(function MapCanvas(props) {
	const { interactive, showObjectiveFilter, apiSourceUrl, sourceData, languages, version, isDev } =
		props;

	return (
		<SourceDataContextProvider
			apiSourceUrl={apiSourceUrl}
			sourceData={sourceData}
			version={version}
			isDev={isDev}
		>
			<MapStoreProvider
				initialState={{
					...(showObjectiveFilter ? { showObjectiveFilter: true } : {}),
					...(interactive === false ? { canvasInteractive: false } : {}),
					...(languages ? { languages } : {}),
				}}
			>
				<MapCanvasContainer {...props} />
			</MapStoreProvider>
		</SourceDataContextProvider>
	);
});
