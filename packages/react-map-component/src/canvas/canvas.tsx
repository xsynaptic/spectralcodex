import type { CSSProperties, FC } from 'react';

import { memo, useMemo } from 'react';
import { Map as ReactMapGlMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '../types';

import { MapControls } from '../controls/controls';
import { MapControlsFilterMenu } from '../controls/controls-filter-menu';
import { PopupDataContextProvider } from '../data/data-popup';
import { SourceDataContextProvider, useSourceDataQuery } from '../data/data-source';
import { useProtomaps } from '../lib/protomaps';
import { MapSource } from '../source/source';
import { MapLayerIdEnum } from '../source/source-config';
import { useMapCanvasCursor, useMapCanvasInteractive, useMapCanvasLoading } from '../store/store';
import { MapStoreProvider } from '../store/store-provider';
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
	languages = ['en'],
	version,
	isDev,
}) {
	const protomapsStyleSpec = useProtomaps({
		protomapsApiKey,
		baseMapTheme,
		spritesId,
		spritesUrl,
		languages,
		isDev,
	});

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const canvasEvents = useMapCanvasEvents();
	const canvasCursor = useMapCanvasCursor();
	const canvasInteractive = useMapCanvasInteractive();
	const canvasLoading = useMapCanvasLoading();

	const loading = useMemo(
		() => canvasLoading || isSourceDataLoading,
		[canvasLoading, isSourceDataLoading],
	);

	/** Optionally display some additional Chinese language translations in some places */
	const showChinese = useMemo(() => languages.some((lang) => lang.startsWith('zh')), [languages]);

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
			mapStyle={protomapsStyleSpec} // Note: this is the MapLibre GL style spec, not CSS!
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
			{...canvasEvents}
		>
			<MapControls />
			<MapSource
				apiDivisionUrl={apiDivisionUrl}
				hasMapIcons={spritesId !== undefined && spritesUrl !== undefined}
				bounds={bounds}
				isDev={isDev}
			/>
			<MapControlsFilterMenu showChinese={showChinese} />
			<PopupDataContextProvider
				apiPopupUrl={apiPopupUrl}
				popupData={popupData}
				version={version}
				isDev={isDev}
			>
				<MapPopup />
			</PopupDataContextProvider>
			<MapCanvasLoading loading={loading} />
		</ReactMapGlMap>
	);
};

export const MapCanvas: FC<MapComponentProps> = memo(function MapCanvas(props) {
	const { cluster, interactive, showObjectiveFilter, apiSourceUrl, sourceData, version, isDev } =
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
					...(cluster ? { canvasClusters: cluster } : {}),
					...(showObjectiveFilter ? { showObjectiveFilter: true } : {}),
					...(interactive === false ? { canvasInteractive: false } : {}),
				}}
			>
				<MapCanvasContainer {...props} />
			</MapStoreProvider>
		</SourceDataContextProvider>
	);
});
