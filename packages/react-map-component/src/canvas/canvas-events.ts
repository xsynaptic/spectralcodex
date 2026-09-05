import type { GeoJSONSource, Source } from 'maplibre-gl';
import type {
	MapCallbacks,
	MapEvent,
	MapLayerMouseEvent,
	ViewStateChangeEvent,
} from 'react-map-gl/maplibre';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { useCallback, useMemo, useRef } from 'react';
import * as R from 'remeda';

import { controlFilterId, mediaQueryMobile } from '#constants.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useMediaQuery } from '#lib/media-query.ts';
import { mapQueryableLayerIds, MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import { writeSavedViewport } from '#store/store-viewport.ts';
import {
	useIsMapCanvasInteractive,
	useMapStoreActions,
	useMapStoreInstance,
} from '#store/store.ts';

const isMapGeojsonSource = (input?: Source): input is GeoJSONSource => input?.type === 'geojson';

const isMapCoordinates = (input: unknown): input is [number, number] =>
	!!input &&
	Array.isArray(input) &&
	input.length === 2 &&
	typeof input[0] === 'number' &&
	typeof input[1] === 'number';

type MapClickEvent = Parameters<NonNullable<MapCallbacks['onClick']>>[0];

type MapClickFeature = NonNullable<MapClickEvent['features']>[number];

async function expandCluster(mapInstance: MapClickEvent['target'], feature: MapClickFeature) {
	const clusterId =
		typeof feature.properties.cluster_id === 'string' ||
		typeof feature.properties.cluster_id === 'number'
			? feature.properties.cluster_id
			: undefined;

	if (!clusterId) return;

	const featureSource = mapInstance.getSource(MapSourceIdEnum.PointCollection);

	if (!isMapGeojsonSource(featureSource)) return;

	const { geometry } = feature;

	if (geometry.type !== GeometryTypeEnum.Point) return;

	if (!isMapCoordinates(geometry.coordinates)) return;

	const featureCenter = geometry.coordinates;

	try {
		const zoom = await featureSource.getClusterExpansionZoom(Number(clusterId));

		mapInstance.easeTo({
			center: featureCenter,
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
		(mapInstance: MapClickEvent['target'], pointId: unknown, coordinates: unknown) => {
			if (typeof pointId !== 'string') return;

			setSelectedId(pointId);
			setHoveredId(undefined);

			if (!isMapCoordinates(coordinates)) return;

			setPopupVisible(false);

			mapInstance.easeTo({
				center: coordinates,
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
			const feature = features?.[0];

			// If the click event is not within interactive layers close any open popup and exit early
			if (!feature?.layer.id || feature.geometry.type !== GeometryTypeEnum.Point) {
				setSelectedId(undefined);
				setHoveredId(undefined);
				return;
			}

			// Close the filter if it's open; the map registered a click
			setFilterOpen(false);

			switch (feature.layer.id) {
				case MapLayerIdEnum.Clusters: {
					void expandCluster(mapInstance, feature);
					break;
				}
				case MapLayerIdEnum.Points:
				case MapLayerIdEnum.PointsTarget:
				case MapLayerIdEnum.PointsImage: {
					selectPoint(mapInstance, feature.properties.id, feature.geometry.coordinates);
					break;
				}
				default: {
					break;
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

			const canvas = mapInstance.getCanvas();

			// promoteId maps feature.id to the point id, or the cluster_id for clusters
			const applyHover = (nextId: string | number | undefined) => {
				const previousId = hoveredFeatureIdRef.current;

				if (previousId === nextId) return;

				if (previousId !== undefined) {
					mapInstance.setFeatureState(
						{ source: MapSourceIdEnum.PointCollection, id: previousId },
						{ hover: false },
					);
				}
				if (nextId !== undefined) {
					mapInstance.setFeatureState(
						{ source: MapSourceIdEnum.PointCollection, id: nextId },
						{ hover: true },
					);
				}
				hoveredFeatureIdRef.current = nextId;
			};

			// Store hoveredId feeds the popup preload; only write when it changes
			const setStoreHoveredId = (nextId: string | undefined) => {
				if (nextId !== mapStoreInstance.getState().hoveredId) setHoveredId(nextId);
			};

			// Nothing under the mouse, clear hover state
			if (!feature) {
				applyHover(undefined);
				setStoreHoveredId(undefined);
				canvas.style.cursor = 'grab';
				return;
			}

			switch (feature.layer.id) {
				case MapLayerIdEnum.Clusters: {
					canvas.style.cursor = 'zoom-in';
					applyHover(feature.id);

					// Cluster IDs are not the same as point IDs
					if (typeof feature.properties.cluster_id === 'number') {
						setStoreHoveredId(`cluster-${String(feature.properties.cluster_id)}`);
					}
					break;
				}
				case MapLayerIdEnum.Points:
				case MapLayerIdEnum.PointsTarget:
				case MapLayerIdEnum.PointsImage: {
					canvas.style.cursor = 'pointer';
					applyHover(feature.id);

					if (typeof feature.properties.id === 'string') {
						setStoreHoveredId(feature.properties.id);
					}
					break;
				}
				default: {
					applyHover(undefined);
					setStoreHoveredId(undefined);
					canvas.style.cursor = 'grab';
					break;
				}
			}
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
