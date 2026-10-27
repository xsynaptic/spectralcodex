import type { FC } from 'react';

import { LngLatBounds } from 'maplibre-gl';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Map as ReactMapGlMap, useMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '#types.ts';

import '#canvas/canvas-worker.ts';
import { useMapCanvasEvents } from '#canvas/canvas-events.ts';
import { MapSelectionFeatureState } from '#canvas/canvas-feature-state.tsx';
import { MapHoverLabel } from '#canvas/canvas-hover-label.tsx';
import { getInitialViewState } from '#canvas/canvas-viewport.ts';
import { MapScopeBar } from '#controls/controls-scope.tsx';
import { MapControls } from '#controls/controls.tsx';
import { CanvasDataProvider } from '#data/data-canvas.tsx';
import { useIsMapLoading } from '#data/data-query.ts';
import { useHostViewSync } from '#host/host-view.ts';
import { getActiveAttribute } from '#lib/active-attribute.ts';
import { useMapConfig } from '#lib/config.tsx';
import { isDocumentDark, useIsDarkMode } from '#lib/dark-mode.ts';
import { getBasemapStyle, setBasemapMode } from '#lib/protomaps.ts';
import { MapHoverPreload, MapPopup } from '#popup/popup.tsx';
import { mapInteractiveLayerIds, mapSlotLayers } from '#source/source-config.ts';
import { MapSource } from '#source/source.tsx';
import { MapStoreProvider } from '#store/store.tsx';
import { MapTargets } from '#targets/targets.tsx';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Features past the antimeridian only draw when world copies are on
function isBeyondAntimeridian(bounds: MapComponentProps['bounds']) {
	if (!bounds) return false;

	const lngLatBounds = LngLatBounds.convert(bounds);

	return lngLatBounds.getWest() < -180 || lngLatBounds.getEast() > 180;
}

const MapCanvasLoading: FC = function MapCanvasLoading() {
	const isLoading = useIsMapLoading();

	return (
		<div className="map-canvas-loading">
			<div className="map-loading-animation" {...getActiveAttribute(isLoading)} />
		</div>
	);
};

const MapRootMarker: FC = function MapRootMarker() {
	const { current: map } = useMap();
	const isDarkMode = useIsDarkMode();

	useIsomorphicLayoutEffect(() => {
		if (!map) return;

		const container = map.getMap().getContainer();

		container.dataset.mapRoot = '';
		container.dataset.mapMode = isDarkMode ? 'dark' : 'light';
	}, [map, isDarkMode]);

	return;
};

const MapBasemapMode: FC<{ initialIsDarkMode: boolean }> = function MapBasemapMode({
	initialIsDarkMode,
}) {
	const { current: map } = useMap();
	const { baseMapTheme, languages, protomapsApiKey } = useMapConfig();
	const isDarkMode = useIsDarkMode();
	const appliedIsDarkMode = useRef(initialIsDarkMode);

	useEffect(() => {
		if (!map || !protomapsApiKey || appliedIsDarkMode.current === isDarkMode) return;

		appliedIsDarkMode.current = isDarkMode;
		setBasemapMode(map.getMap(), { baseMapTheme, isDarkMode, languages });
	}, [map, baseMapTheme, isDarkMode, languages, protomapsApiKey]);

	return;
};

const MapCanvasContainer: FC = function MapCanvasContainer() {
	const {
		baseMapTheme,
		bounds,
		center,
		hash,
		isInteractive,
		languages,
		mapId,
		maxBounds,
		protomapsApiKey,
		style,
		zoom,
	} = useMapConfig();
	const [initialIsDarkMode] = useState(isDocumentDark);
	const [initialStyleSpec] = useState(() => {
		const basemapStyle = getBasemapStyle({
			baseMapTheme,
			isDarkMode: initialIsDarkMode,
			languages,
			protomapsApiKey,
		});

		return { ...basemapStyle, layers: [...basemapStyle.layers, ...mapSlotLayers] };
	});
	const canvasEvents = useMapCanvasEvents();

	const [initialViewState] = useState(() =>
		getInitialViewState({ bounds, center, mapId, maxBounds, zoom }),
	);

	useHostViewSync();

	return (
		<ReactMapGlMap
			attributionControl={false}
			fadeDuration={100}
			hash={hash ?? false}
			initialViewState={initialViewState}
			interactive={isInteractive}
			interactiveLayerIds={[...mapInteractiveLayerIds]}
			mapStyle={initialStyleSpec}
			maxZoom={19}
			minZoom={4}
			renderWorldCopies={isBeyondAntimeridian(bounds) || isBeyondAntimeridian(maxBounds)}
			style={{ height: 'auto', ...style }}
			{...canvasEvents}
		>
			<MapBasemapMode initialIsDarkMode={initialIsDarkMode} />
			<MapControls />
			<MapPopup />
			<MapHoverPreload />
			<MapCanvasLoading />
			<MapSource />
			<MapHoverLabel />
			<MapScopeBar />
			<MapTargets />
			<MapSelectionFeatureState />
			<MapRootMarker />
		</ReactMapGlMap>
	);
};

export const MapCanvas: FC = memo(function MapCanvas() {
	const { host } = useMapConfig();

	return (
		<MapStoreProvider page={host.readView()}>
			<CanvasDataProvider>
				<MapCanvasContainer />
			</CanvasDataProvider>
		</MapStoreProvider>
	);
});
