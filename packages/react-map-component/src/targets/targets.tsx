import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LngLatBoundsLike, LngLatLike } from 'maplibre-gl';
import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapComponentProps, MapScope } from '#types.ts';

import { mapSyncEventName } from '#constants.ts';
import { useMapRows } from '#data/data-query.ts';
import { applyHostInset, useHostInset } from '#host/host-inset.ts';
import { useDocumentEventValue } from '#lib/document-event.ts';
import { selectScope, selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';
import {
	getTargetBounds,
	getTargetDuration,
	getTargetZoom,
	isInView,
} from '#targets/targets-fit-factory.ts';
import { getTargetPoints } from '#targets/targets-markers-factory.ts';
import { MapTargetMarkers } from '#targets/targets-markers.tsx';

const fitPadding = 50;

interface MapFitView {
	bounds?: MapComponentProps['bounds'] | undefined;
	scope?: MapScope | undefined;
	targetIds: Array<string>;
}

function getScreensTo(map: MapRef, center: LngLatLike) {
	const from = map.project(map.getCenter());
	const to = map.project(center);

	return Math.hypot(to.x - from.x, to.y - from.y) / map.getContainer().clientWidth;
}

function isTargetInView(map: MapRef, positions: ReadonlyArray<[number, number]>) {
	const { clientHeight, clientWidth } = map.getContainer();
	const { bottom = 0, left = 0, right = 0, top = 0 } = map.getPadding();
	const frame = {
		bottom: clientHeight - bottom - fitPadding,
		left: left + fitPadding,
		right: clientWidth - right - fitPadding,
		top: top + fitPadding,
	};

	return isInView(
		positions.map((position) => map.project(position)),
		frame,
		map.getZoom(),
	);
}

function getBoundsCamera(map: MapRef, bounds: LngLatBoundsLike | undefined) {
	const camera = bounds ? map.cameraForBounds(bounds, { padding: fitPadding }) : undefined;

	if (!camera?.center || camera.zoom === undefined) return;

	return { center: camera.center, zoom: camera.zoom };
}

function getViewFit(map: MapRef, sourceData: ReadonlyArray<MapSourceItem>, view: MapFitView) {
	const positions = getTargetPoints(sourceData, view.targetIds).map(
		({ coordinates }) => coordinates,
	);

	if (isTargetInView(map, positions)) {
		return { center: map.getCenter(), duration: 0, zoom: map.getZoom() };
	}

	const targetBounds = getTargetBounds(positions);
	const fit = getBoundsCamera(map, targetBounds ?? (view.scope ? view.bounds : undefined));

	if (!fit) return;

	const zoom = targetBounds ? getTargetZoom(map.getZoom(), fit.zoom) : fit.zoom;

	return {
		center: fit.center,
		duration: getTargetDuration(zoom - map.getZoom(), getScreensTo(map, fit.center)),
		zoom,
	};
}

function useViewFit(view: MapFitView) {
	const { current: map } = useMap();
	const { data: sourceData } = useMapRows();
	const inset = useHostInset(map);

	useEffect(() => {
		if (map) applyHostInset(map, inset);
	}, [inset, map]);

	const getWidth = useCallback(() => map?.getContainer().clientWidth ?? 0, [map]);

	const width = useDocumentEventValue(mapSyncEventName, getWidth, 0);

	const key = `${view.targetIds.join(' ')} ${JSON.stringify(view.bounds)} ${String(width)}`;

	const handledKeyRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (!map || !sourceData || handledKeyRef.current === key) return;

		const isFirstFit = handledKeyRef.current === undefined;

		handledKeyRef.current = key;

		// MapLibre resizes from a throttled observer; until then the fit measures the old width
		map.resize();

		const fit = getViewFit(map, sourceData, view);

		if (!fit) return;

		map.easeTo({
			center: fit.center,
			duration: isFirstFit ? 0 : fit.duration,
			zoom: fit.zoom,
		});
	}, [key, map, sourceData, view]);
}

export const MapTargets: FC = function MapTargets() {
	const targetIds = useMapStore(selectTargetIds);
	const bounds = useMapStore((state) => state.view.scope?.bounds);
	const scope = useMapStore(selectScope);

	useViewFit(useMemo(() => ({ bounds, scope, targetIds }), [bounds, scope, targetIds]));

	return <MapTargetMarkers />;
};
