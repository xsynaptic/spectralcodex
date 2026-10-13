import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LngLatLike } from 'maplibre-gl';
import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapComponentProps, MapScope } from '#types.ts';

import { MapSelectedMarker, MapTargetMarkers } from '#canvas/canvas-markers.tsx';
import {
	getTargetBounds,
	getTargetDuration,
	getTargetPositions,
	getTargetZoom,
} from '#canvas/canvas-view-factory.ts';
import { useMapView } from '#canvas/canvas-view.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useMapHost } from '#host/host-context.tsx';
import { useHostSyncValue } from '#host/host-view.ts';
import { useMapStoreActions } from '#store/store.ts';

const fitPadding = 50;

interface MapFitView {
	bounds?: MapComponentProps['bounds'] | undefined;
	scope?: MapScope | undefined;
	targetIds: Array<string>;
}

// Pan distance to a position, in map widths at the current zoom
function getScreensTo(map: MapRef, center: LngLatLike) {
	const container = map.getContainer();
	const point = map.project(center);

	return (
		Math.hypot(point.x - container.clientWidth / 2, point.y - container.clientHeight / 2) /
		container.clientWidth
	);
}

function getViewFit(map: MapRef, sourceData: ReadonlyArray<MapSourceItem>, view: MapFitView) {
	const targetBounds = getTargetBounds(getTargetPositions(sourceData, view.targetIds));
	// A Scope the user cleared is not fitted again when the map resizes
	const bounds = targetBounds ?? (view.scope ? view.bounds : undefined);
	const fit = bounds ? map.cameraForBounds(bounds, { padding: fitPadding }) : undefined;

	if (!fit?.center || fit.zoom === undefined) return;

	// Build-time bounds already carry a minimum buffer, so only a Target fit is clamped
	const zoom = targetBounds ? getTargetZoom(map.getZoom(), fit.zoom) : fit.zoom;

	return {
		center: fit.center,
		duration: getTargetDuration(zoom - map.getZoom(), getScreensTo(map, fit.center)),
		zoom,
	};
}

// True once the camera has settled on the current Targets, or on the view's bounds when it has none
function useTargetFit(view: MapFitView) {
	const { current: map } = useMap();
	const { data: sourceData } = useSourceDataQuery();
	const { setFilterOpen, setSelectedId } = useMapStoreActions();

	const getWidth = useCallback(() => map?.getContainer().clientWidth ?? 0, [map]);

	// The host resizes the container as chrome beside the map comes and goes
	const width = useHostSyncValue(getWidth, 0);

	const key = `${view.targetIds.join(' ')} ${JSON.stringify(view.bounds)} ${String(width)}`;

	// Filters and re-renders must not re-run the fit for a Target already handled
	const handledKeyRef = useRef<string | undefined>(undefined);
	const [settledKey, setSettledKey] = useState<string | undefined>();

	useEffect(() => {
		if (!map || !sourceData || handledKeyRef.current === key) return;

		const isFirstFit = handledKeyRef.current === undefined;

		handledKeyRef.current = key;
		setSelectedId(undefined);
		setFilterOpen(false);

		// An interrupted move fires its `moveend` here, before the listener below can take it for ours
		map.stop();
		// MapLibre resizes from a throttled observer; until then the fit measures the old width
		map.resize();

		const fit = getViewFit(map, sourceData, view);

		if (!fit) return;

		// Attached first; under reduced motion `moveend` fires inside the call
		void map.once('moveend', () => {
			setSettledKey(key);
		});

		map.easeTo({
			center: fit.center,
			// The first fit lands as the map appears; easing there reads as lag
			duration: isFirstFit ? 0 : fit.duration,
			zoom: fit.zoom,
		});
	}, [key, map, setFilterOpen, setSelectedId, sourceData, view]);

	return settledKey === key;
}

const MapSyncedTargets: FC = function MapSyncedTargets() {
	const view = useMapView();
	const { targetIds } = view;
	const isSettled = useTargetFit(view);

	return (
		<>
			{isSettled ? <MapTargetMarkers targetIds={targetIds} /> : undefined}
			<MapSelectedMarker targetIds={targetIds} />
		</>
	);
};

export const MapTargets: FC = function MapTargets() {
	const host = useMapHost();
	const { targetIds } = useMapView();

	if (host) return <MapSyncedTargets />;

	return (
		<>
			<MapTargetMarkers targetIds={targetIds} />
			<MapSelectedMarker targetIds={targetIds} />
		</>
	);
};
