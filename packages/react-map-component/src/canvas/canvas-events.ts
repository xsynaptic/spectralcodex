import type { GeoJSONSource, MapGeoJSONFeature, Source } from 'maplibre-gl';
import type {
	MapCallbacks,
	MapEvent,
	MapLayerMouseEvent,
	ViewStateChangeEvent,
} from 'react-map-gl/maplibre';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { useCallback, useMemo, useRef } from 'react';
import * as R from 'remeda';

import type { MapClickInput, MapHoverInput } from '#canvas/canvas-events-factory.ts';
import type { MapFeatureOpenDetail } from '#types.ts';

import {
	decideClickActions,
	decideHoverIntent,
	getSelectionOutcome,
} from '#canvas/canvas-events-factory.ts';
import { getPopupLayout } from '#canvas/canvas-popup-factory.ts';
import { useMapTargetIds } from '#canvas/canvas-view.tsx';
import { controlFilterId, mapFeatureOpenEventName } from '#constants.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useTrackMap } from '#lib/track-context.tsx';
import { trackMapErrorOnce } from '#lib/track.ts';
import { mapQueryableLayerIds, MapSourceIdEnum } from '#source/source-config.ts';
import { writeSavedViewport } from '#store/store-viewport.ts';
import {
	useIsMapCanvasInteractive,
	useMapStoreActions,
	useMapStoreInstance,
} from '#store/store.ts';

const isMapGeojsonSource = (input?: Source): input is GeoJSONSource => input?.type === 'geojson';

type MapClickEvent = Parameters<NonNullable<MapCallbacks['onClick']>>[0];

type MapClickFeature = NonNullable<MapClickEvent['features']>[number];

function createGrabCursorHandler(
	cursor: 'grab' | 'grabbing',
): NonNullable<MapCallbacks['onMouseDown']> {
	return ({ features, target: mapInstance }) => {
		const feature = features?.[0];

		if (feature?.layer.id !== undefined) return;

		mapInstance.getCanvas().style.cursor = cursor;
	};
}

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

function getClickInput(feature: MapClickFeature | undefined): MapClickInput {
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

// The page cancels this event when it raises a lowered Sheet instead
function isTargetOpenCancelled() {
	return !document.dispatchEvent(
		new CustomEvent<MapFeatureOpenDetail>(mapFeatureOpenEventName, {
			cancelable: true,
			detail: { url: location.pathname },
		}),
	);
}

function easeToPopup(
	mapInstance: MapClickEvent['target'],
	center: [number, number] | undefined,
	setPopupVisible: (isVisible: boolean) => void,
) {
	if (!center) return;

	// Stopping a running ease fires its `moveend` now, so it can neither trigger the listener below nor undo the hide
	mapInstance.stop();

	setPopupVisible(false);

	// Under reduced motion MapLibre zeroes the duration and fires `moveend` synchronously inside `easeTo`
	void mapInstance.once('moveend', () => {
		setPopupVisible(true);
	});

	mapInstance.easeTo({
		center,
		duration: 150,
		padding: getPopupLayout(mapInstance.getContainer().clientWidth).isNarrow
			? { bottom: 180, left: 0, right: 0, top: 0 }
			: { bottom: 0, left: 0, right: 180, top: 0 },
	});
}

const onMouseDown = createGrabCursorHandler('grabbing');
const onMouseUp = createGrabCursorHandler('grab');

export function useMapCanvasEvents({
	isHosted,
	mapId,
}: {
	isHosted: boolean;
	mapId: string | undefined;
}) {
	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isInteractive = useIsMapCanvasInteractive();

	const { setCanvasLoading } = useMapStoreActions();
	const trackMap = useTrackMap();

	const onClick = useClickHandler(isHosted);
	const throttledOnMouseMove = useThrottledMouseMoveHandler();
	const debouncedFilterControlSetup = useDebouncedFilterControlSetup();

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
			trackMapErrorOnce('canvas');
			console.warn('[Map]', error.message);
		},
		onLoad: (event: MapEvent) => {
			setCanvasLoading(false);
			trackMap({ name: 'map-load' });

			if (isInteractive) debouncedFilterControlSetup.call(event);
		},
		...(isInteractive
			? {
					onClick,
					onMouseDown,
					onMouseUp,
					onMoveEnd,
					onResize: debouncedFilterControlSetup.call,
					...(isSourceDataLoading
						? {}
						: {
								onMouseMove: throttledOnMouseMove.call,
							}),
				}
			: {}),
	} satisfies MapCallbacks;
}

function useClickHandler(isHosted: boolean) {
	const { setClickedId, setFilterOpen, setHoveredId, setPopupVisible, setSelectedId } =
		useMapStoreActions();
	const targetIds = useMapTargetIds();

	const selectPoint = useCallback(
		(
			mapInstance: MapClickEvent['target'],
			pointId: string,
			center: [number, number] | undefined,
		) => {
			const isTarget = targetIds.includes(pointId);

			if (isHosted && isTarget && isTargetOpenCancelled()) return;

			const outcome = getSelectionOutcome({
				isHosted,
				isLoading: true,
				isTarget,
				targetCount: targetIds.length,
				url: undefined,
			});

			if (outcome === 'none') {
				if (isHosted) window.scrollTo({ top: 0 });
				return;
			}

			setSelectedId(pointId);
			setClickedId(pointId);
			setHoveredId(undefined);

			// A Target's popup opens on whichever side has room, so the map stays where it is
			if (outcome !== 'popup' || isTarget) return;

			easeToPopup(mapInstance, center, setPopupVisible);
		},
		[isHosted, setSelectedId, setClickedId, setHoveredId, setPopupVisible, targetIds],
	);

	return useCallback<NonNullable<MapCallbacks['onClick']>>(
		({ features, target: mapInstance }) => {
			const actions = decideClickActions(getClickInput(features?.[0]));

			for (const action of actions) {
				switch (action.kind) {
					case 'clear-selection': {
						setSelectedId(undefined);
						setHoveredId(undefined);
						break;
					}
					case 'close-filter': {
						setFilterOpen(false);
						break;
					}
					case 'expand-cluster': {
						void expandCluster(mapInstance, action.clusterId, action.center);
						break;
					}
					case 'select-point': {
						selectPoint(mapInstance, action.pointId, action.center);
						break;
					}
				}
			}
		},
		[selectPoint, setFilterOpen, setSelectedId, setHoveredId],
	);
}

function useDebouncedFilterControlSetup() {
	const { setFilterPosition } = useMapStoreActions();

	return useMemo(
		() =>
			R.funnel<Array<MapEvent>, HTMLElement | undefined>(
				(container) => {
					if (!container) {
						console.warn('[Map] Map instance not found!');
						return;
					}

					const filterControl = container.querySelector<HTMLButtonElement>(`#${controlFilterId}`);

					if (!filterControl) {
						console.warn('[Map] Filter control not found!');
						return;
					}

					const { x: containerX, y: containerY } = container.getBoundingClientRect();
					const {
						height: controlHeight,
						width: controlWidth,
						x: controlX,
						y: controlY,
					} = filterControl.getBoundingClientRect();

					setFilterPosition({
						x: controlX - containerX + controlWidth,
						y: controlY - containerY + controlHeight / 2,
					});
				},
				{
					minQuietPeriodMs: 300,
					reducer: (_previousElement, ...args: Array<MapEvent>) => {
						if (args.length === 0 || !args[0]) return;

						return args[0].target.getContainer();
					},
				},
			),
		[setFilterPosition],
	);
}

function useThrottledMouseMoveHandler() {
	const mapStoreInstance = useMapStoreInstance();

	const { setHoveredId } = useMapStoreActions();

	// Kept in a ref, not the store, so hover updates never trigger a React render
	const hoveredFeatureIdRef = useRef<number | string | undefined>(undefined);

	const onMouseMove = useCallback(
		(event: MapLayerMouseEvent | undefined) => {
			if (!event) return;

			const { point, target: mapInstance } = event;

			// Ensure all queryable layers have been loaded by MapLibre
			for (const layerId of mapQueryableLayerIds) {
				if (!mapInstance.getLayer(layerId)) return;
			}

			const renderedFeatures = mapInstance.queryRenderedFeatures(point, {
				layers: [...mapQueryableLayerIds],
			});

			const feature = renderedFeatures[0];

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

			// Store hoveredId feeds the popup preload
			if (intent.storeHoveredIdUpdate) setHoveredId(intent.storeHoveredIdUpdate.hoveredId);

			mapInstance.getCanvas().style.cursor = intent.cursor;
		},
		[setHoveredId, mapStoreInstance],
	);

	return useMemo(
		() =>
			R.funnel(onMouseMove, {
				minGapMs: 20,
				reducer: (_, ...args: Array<MapLayerMouseEvent>) => {
					if (args.length === 0 || !args[0]) return;

					return args[0];
				},
				triggerAt: 'both',
			}),
		[onMouseMove],
	);
}
