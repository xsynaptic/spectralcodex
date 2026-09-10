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

function getClickInput(feature: MapClickFeature | undefined): MapClickInput {
	const geometry = feature?.geometry;

	return {
		layerId: feature?.layer.id,
		geometryType: geometry?.type,
		coordinates: geometry?.type === GeometryTypeEnum.Point ? geometry.coordinates : undefined,
		pointId: feature?.properties.id,
		clusterId: feature?.properties.cluster_id,
	};
}

function getHoverInput(
	feature: MapGeoJSONFeature | undefined,
	hoveredFeatureId: string | number | undefined,
	storeHoveredId: string | undefined,
): MapHoverInput {
	return {
		layerId: feature?.layer.id,
		featureId: feature?.id,
		pointId: feature?.properties.id,
		clusterId: feature?.properties.cluster_id,
		hoveredFeatureId,
		storeHoveredId,
	};
}

async function expandCluster(
	mapInstance: MapClickEvent['target'],
	clusterId: string | number,
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

export function useMapCanvasEvents({ mapId }: { mapId: string | undefined }) {
	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isInteractive = useIsMapCanvasInteractive();
	const isMobile = useMediaQuery({ below: mediaQueryMobile });

	const mapStoreInstance = useMapStoreInstance();

	// Kept in a ref, not the store, so hover updates never trigger a React render
	const hoveredFeatureIdRef = useRef<string | number | undefined>(undefined);

	const {
		setCanvasLoading,
		setSelectedId,
		setPopupVisible,
		setHoveredId,
		setFilterPosition,
		setFilterOpen,
	} = useMapStoreActions();

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

			mapInstance.easeTo({
				center,
				duration: 150,
				padding: isMobile ? { bottom: 180, right: 0 } : { right: 180, bottom: 0 },
			});

			void mapInstance.once('moveend', () => {
				setPopupVisible(true);
			});
		},
		[isMobile, setSelectedId, setHoveredId, setPopupVisible],
	);

	const onClick = useCallback<NonNullable<MapCallbacks['onClick']>>(
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
					{ source: MapSourceIdEnum.PointCollection, id: featureId },
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

	// Create throttled version using funnel
	const throttledOnMouseMove = useMemo(
		() =>
			R.funnel(onMouseMove, {
				reducer: (_, ...args: Array<MapLayerMouseEvent>) => {
					if (args.length === 0 || !args[0]) return;

					return args[0];
				},
				minGapMs: 20,
				triggerAt: 'both',
			}),
		[onMouseMove],
	);

	const onMouseDown = useCallback<NonNullable<MapCallbacks['onMouseDown']>>(
		({ features, target: mapInstance }) => {
			const feature = features?.[0];

			if (feature?.layer.id === undefined) {
				mapInstance.getCanvas().style.cursor = 'grabbing';
			}
		},
		[],
	);

	const onMouseUp = useCallback<NonNullable<MapCallbacks['onMouseUp']>>(
		({ features, target: mapInstance }) => {
			const feature = features?.[0];

			if (feature?.layer.id === undefined) {
				mapInstance.getCanvas().style.cursor = 'grab';
			}
		},
		[],
	);

	const onMoveEnd = useCallback(
		(event: ViewStateChangeEvent) => {
			if (!mapId) return;

			writeSavedViewport(mapId, {
				longitude: event.viewState.longitude,
				latitude: event.viewState.latitude,
				zoom: event.viewState.zoom,
			});
		},
		[mapId],
	);

	const debouncedFilterControlSetup = useMemo(
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
						x: controlX,
						y: controlY,
						height: controlHeight,
						width: controlWidth,
					} = filterControl.getBoundingClientRect();

					setFilterPosition({
						x: controlX - containerX + controlWidth,
						y: controlY - containerY + controlHeight / 2,
					});
				},
				{
					reducer: (_previousElement, ...args: Array<MapEvent>) => {
						if (args.length === 0 || !args[0]) return;

						return args[0].target.getContainer();
					},
					minQuietPeriodMs: 300,
				},
			),
		[setFilterPosition],
	);

	return {
		onLoad: (event: MapEvent) => {
			setCanvasLoading(false);

			// Initialize the position of the filter control on interactive maps
			if (isInteractive) debouncedFilterControlSetup.call(event);
		},
		// Style, tile, and sprite failures leave onLoad unfired; clear the spinner rather than hang
		onError: ({ error }) => {
			setCanvasLoading(false);
			console.warn('[Map]', error.message);
		},
		...(isInteractive
			? {
					onResize: debouncedFilterControlSetup.call,
					onClick,
					onMouseDown,
					onMouseUp,
					onMoveEnd,
					...(isSourceDataLoading
						? {}
						: {
								onMouseMove: throttledOnMouseMove.call,
							}),
				}
			: {}),
	} satisfies MapCallbacks;
}
