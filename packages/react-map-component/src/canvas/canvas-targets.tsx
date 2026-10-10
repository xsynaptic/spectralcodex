import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LngLatLike } from 'maplibre-gl';
import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapComponentProps, MapView } from '#types.ts';

import {
	MapSelectedMarker,
	MapSyncedTargetMarkers,
	MapTargetMarkers,
} from '#canvas/canvas-markers.tsx';
import {
	getTargetBounds,
	getTargetDuration,
	getTargetPositions,
	getTargetZoom,
} from '#canvas/canvas-view-factory.ts';
import { useMapView } from '#canvas/canvas-view.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useDocumentEventValue } from '#lib/document-attribute.ts';
import { useMapStoreActions } from '#store/store.ts';

const fitPadding = 50;

// The last popup leaves its padding on the transform, so zoom would turn around an off-centre point
// The camera moves onto the screen centre as the padding goes, so nothing shifts
function clearPadding(map: MapRef) {
	if (Object.values(map.getPadding()).every((side) => side === 0)) return;

	const container = map.getContainer();

	map.jumpTo({
		center: map.unproject([container.clientWidth / 2, container.clientHeight / 2]),
		padding: { bottom: 0, left: 0, right: 0, top: 0 },
	});
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

// Targets win; a view with bounds and no Targets fits those
function getViewFit(
	map: MapRef,
	sourceData: ReadonlyArray<MapSourceItem>,
	view: Pick<MapView, 'bounds' | 'targetIds'>,
) {
	const targetBounds = getTargetBounds(getTargetPositions(sourceData, view.targetIds ?? []));
	const bounds = targetBounds ?? view.bounds;
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
function useTargetFit(view: Pick<MapView, 'bounds' | 'targetIds'>, eventName: string) {
	const { current: map } = useMap();
	const { data: sourceData } = useSourceDataQuery();
	const { setFilterOpen, setSelectedId } = useMapStoreActions();

	const getWidth = useCallback(() => map?.getContainer().clientWidth ?? 0, [map]);

	// The host resizes the container as chrome beside the map comes and goes
	const width = useDocumentEventValue(eventName, getWidth, 0);

	const key = `${view.targetIds?.join(' ') ?? ''} ${JSON.stringify(view.bounds)} ${String(width)}`;

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
		clearPadding(map);

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

const MapSyncedTargets: FC<{
	syncEventName: string;
}> = function MapSyncedTargets({ syncEventName }) {
	const view = useMapView();
	const { targetIds } = view;
	const isSettled = useTargetFit(view, syncEventName);

	return (
		<>
			{isSettled ? <MapSyncedTargetMarkers targetIds={targetIds} /> : undefined}
			<MapSelectedMarker targetIds={targetIds} />
		</>
	);
};

export const MapTargets: FC<Pick<MapComponentProps, 'host'>> = function MapTargets({ host }) {
	const { targetIds } = useMapView();

	if (host) return <MapSyncedTargets syncEventName={host.syncEventName} />;

	return (
		<>
			<MapTargetMarkers targetIds={targetIds} />
			<MapSelectedMarker targetIds={targetIds} />
		</>
	);
};
