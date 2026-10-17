import type { GeoJSONSource, MapGeoJSONFeature, Source } from 'maplibre-gl';
import type { MapCallbacks, MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import * as R from 'remeda';

import type { MapCanvasClickInput, MapHoverInput } from '#canvas/canvas-events-factory.ts';
import type { MapHoverCluster } from '#types.ts';

import { decideHoverIntent, getCanvasClickHit } from '#canvas/canvas-events-factory.ts';
import { writeSavedViewport } from '#canvas/canvas-viewport.ts';
import { useMapRows } from '#data/data-query.ts';
import { useMapClick } from '#host/host-click.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useTrackMap } from '#lib/track-hook.ts';
import { MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import { useMapStore, useMapStoreApi } from '#store/store.tsx';
import { trackMapErrorOnce } from '#track.ts';

const hoverQuery = '(hover: hover)';

const isMapGeojsonSource = (input?: Source): input is GeoJSONSource => input?.type === 'geojson';

type MapClickEvent = Parameters<NonNullable<MapCallbacks['onClick']>>[0];

type MapClickFeature = NonNullable<MapClickEvent['features']>[number];

async function expandCluster(
	mapInstance: MapClickEvent['target'],
	clusterId: number | string,
	center: [number, number],
) {
	const featureSource = mapInstance.getSource(MapSourceIdEnum.PointCollection);

	if (!isMapGeojsonSource(featureSource)) return;

	try {
		const zoom = await featureSource.getClusterExpansionZoom(Number(clusterId));

		mapInstance.easeTo({
			center,
			duration: 200,
			zoom,
		});
	} catch {
		console.warn('[Map] Could not get cluster expansion zoom!');
	}
}

function getClickInput(feature: MapClickFeature | undefined): MapCanvasClickInput {
	const geometry = feature?.geometry;

	return {
		clusterId: feature?.properties.cluster_id,
		coordinates: geometry?.type === GeometryTypeEnum.Point ? geometry.coordinates : undefined,
		geometryType: geometry?.type,
		layerId: feature?.layer.id,
		pointId: feature?.properties.id,
	};
}

function getHoverInput(
	feature: MapGeoJSONFeature | undefined,
	hoveredFeatureId: number | string | undefined,
	storeHoveredId: string | undefined,
): MapHoverInput {
	return {
		clusterId: feature?.properties.cluster_id,
		featureId: feature?.id,
		hoveredFeatureId,
		layerId: feature?.layer.id,
		pointId: feature?.properties.id,
		storeHoveredId,
	};
}

// The count label needs MapLibre's own cluster feature, since `point_count` exists nowhere else
function getHoverCluster(feature: MapGeoJSONFeature | undefined): MapHoverCluster | undefined {
	if (feature?.layer.id !== MapLayerIdEnum.Clusters) return;
	if (feature.geometry.type !== GeometryTypeEnum.Point) return;

	return { geometry: feature.geometry, properties: { ...feature.properties }, type: 'Feature' };
}

interface MapHoverEvent {
	feature: MapGeoJSONFeature | undefined;
	mapInstance: MapLayerMouseEvent['target'];
}

const canvasErrorMessageMaxLength = 100;

// Tile URLs carry the Protomaps key in their query string
function getCanvasErrorData(error: Error) {
	const probe = document.createElement('canvas');

	return {
		message: error.message.replaceAll(/\?\S*/g, '').slice(0, canvasErrorMessageMaxLength),
		webgl: Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl')),
	};
}

function subscribeHover(callback: () => void) {
	const query = matchMedia(hoverQuery);

	query.addEventListener('change', callback);

	return () => {
		query.removeEventListener('change', callback);
	};
}

// A tap hovers through its compatibility mousemove and never leaves, so its label would stick
function canHover() {
	return matchMedia(hoverQuery).matches;
}

export function useMapCanvasEvents() {
	const { isLoading: isSourceDataLoading } = useMapRows();

	const { isInteractive, mapId } = useMapConfig();
	const isHoverable = useSyncExternalStore(subscribeHover, canHover, () => false);

	const { setCanvasLoading } = useMapStore((state) => state.actions);
	const trackMap = useTrackMap();

	const onClick = useClickHandler();
	const throttledOnMouseMove = useThrottledMouseMoveHandler();

	const onMoveEnd = useCallback(
		(event: ViewStateChangeEvent) => {
			if (!mapId) return;

			writeSavedViewport(mapId, {
				latitude: event.viewState.latitude,
				longitude: event.viewState.longitude,
				zoom: event.viewState.zoom,
			});
		},
		[mapId],
	);

	return {
		// Style, tile, and sprite failures leave onLoad unfired; clear the spinner rather than hang
		onError: ({ error }) => {
			setCanvasLoading(false);
			trackMapErrorOnce('canvas', () => getCanvasErrorData(error));
			console.warn('[Map]', error.message);
		},
		onLoad: () => {
			setCanvasLoading(false);
			trackMap({ name: 'map-load' });
		},
		...(isInteractive
			? {
					onClick,
					onMoveEnd,
					...(isSourceDataLoading || !isHoverable
						? {}
						: {
								onMouseMove: throttledOnMouseMove.call,
							}),
				}
			: {}),
	} satisfies MapCallbacks;
}

function useClickHandler() {
	const click = useMapClick();

	return useCallback<NonNullable<MapCallbacks['onClick']>>(
		({ features, target: mapInstance }) => {
			const outcome = click(getCanvasClickHit(getClickInput(features?.[0])), mapInstance);

			if (outcome.kind === 'expand-cluster') {
				void expandCluster(mapInstance, outcome.clusterId, outcome.center);
			}
		},
		[click],
	);
}

function useThrottledMouseMoveHandler() {
	const mapStoreInstance = useMapStoreApi();

	const { setHoveredId } = useMapStore((state) => state.actions);

	const hoveredFeatureIdRef = useRef<number | string | undefined>(undefined);

	const onMouseMove = useCallback(
		(event: MapHoverEvent | undefined) => {
			if (!event) return;

			const { feature, mapInstance } = event;

			const intent = decideHoverIntent(
				getHoverInput(feature, hoveredFeatureIdRef.current, mapStoreInstance.getState().hoveredId),
			);

			for (const { featureId, hover } of intent.featureStateChanges) {
				mapInstance.setFeatureState(
					{ id: featureId, source: MapSourceIdEnum.PointCollection },
					{ hover },
				);
			}

			hoveredFeatureIdRef.current = intent.hoveredFeatureId;

			if (intent.storeHoveredIdUpdate) {
				const { hoveredId } = intent.storeHoveredIdUpdate;

				setHoveredId(hoveredId, hoveredId ? getHoverCluster(feature) : undefined);
			}

			mapInstance.getCanvas().style.cursor = intent.cursor;
		},
		[setHoveredId, mapStoreInstance],
	);

	return useMemo(
		() =>
			R.funnel(onMouseMove, {
				minGapMs: 20,
				reducer: (_, ...args: Array<MapLayerMouseEvent>): MapHoverEvent | undefined => {
					if (args.length === 0 || !args[0]) return;

					return { feature: args[0].features?.[0], mapInstance: args[0].target };
				},
				triggerAt: 'both',
			}),
		[onMouseMove],
	);
}
