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

import { decideClickActions, decideHoverIntent } from '#canvas/canvas-events-factory.ts';
import { controlFilterId, mediaQueryMobile } from '#constants.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useMediaQuery } from '#lib/media-query.ts';
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

const onMouseDown = createGrabCursorHandler('grabbing');
const onMouseUp = createGrabCursorHandler('grab');

export function useMapCanvasEvents({ mapId }: { mapId: string | undefined }) {
	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isInteractive = useIsMapCanvasInteractive();

	const { setCanvasLoading } = useMapStoreActions();

	const onClick = useClickHandler();
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
			console.warn('[Map]', error.message);
		},
		onLoad: (event: MapEvent) => {
			setCanvasLoading(false);

			// Initialize the position of the filter control on interactive maps
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

function useClickHandler() {
	const isMobile = useMediaQuery({ below: mediaQueryMobile });

	const { setFilterOpen, setHoveredId, setPopupVisible, setSelectedId } = useMapStoreActions();

	const selectPoint = useCallback(
		(
			mapInstance: MapClickEvent['target'],
			pointId: string,
			center: [number, number] | undefined,
		) => {
			setSelectedId(pointId);
			setHoveredId(undefined);

			if (!center) return;

			setPopupVisible(false);

			// Under reduced motion MapLibre zeroes the duration and fires `moveend` synchronously inside `easeTo`
			void mapInstance.once('moveend', () => {
				setPopupVisible(true);
			});

			mapInstance.easeTo({
				center,
				duration: 150,
				padding: isMobile ? { bottom: 180, right: 0 } : { bottom: 0, right: 180 },
			});
		},
		[isMobile, setSelectedId, setHoveredId, setPopupVisible],
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

			// Note: this only queries the first matching feature, but that is sufficient
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
