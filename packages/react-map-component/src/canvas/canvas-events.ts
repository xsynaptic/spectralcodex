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

import { CONTROL_FILTER_ID, MEDIA_QUERY_MOBILE } from '../constants';
import { useSourceDataQuery } from '../data/data-source';
import { useMediaQuery } from '../lib/media-query';
import { MAP_QUERYABLE_LAYER_IDS, MapLayerIdEnum, MapSourceIdEnum } from '../source/source-config';
import { useMapCanvasInteractive, useMapStoreActions, useMapStoreInstance } from '../store/store';
import { writeSavedViewport } from '../store/store-viewport';

const isMapGeojsonSource = (input?: Source): input is GeoJSONSource => input?.type === 'geojson';

const isMapCoordinates = (input: unknown): input is [number, number] =>
	!!input &&
	Array.isArray(input) &&
	input.length === 2 &&
	typeof input[0] === 'number' &&
	typeof input[1] === 'number';

export function useMapCanvasEvents({ mapId }: { mapId: string | undefined }) {
	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isInteractive = useMapCanvasInteractive();
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

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
					const clusterId =
						typeof feature.properties.cluster_id === 'string' ||
						typeof feature.properties.cluster_id === 'number'
							? feature.properties.cluster_id
							: undefined;

					if (!clusterId) return;

					const featureSource = mapInstance.getSource(MapSourceIdEnum.PointCollection);

					if (!isMapGeojsonSource(featureSource)) return;

					// This is broken out here to avoid some complicated async logic
					const featureCenter = isMapCoordinates(feature.geometry.coordinates)
						? feature.geometry.coordinates
						: undefined;

					if (!featureCenter) return;

					// Expand clusters by zooming; note that this returns a promise, complicating this callback
					void (async () => {
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
					})();
					break;
				}

				case MapLayerIdEnum.Points:
				case MapLayerIdEnum.PointsTarget:
				case MapLayerIdEnum.PointsImage: {
					const pointId =
						typeof feature.properties.id === 'string' ? feature.properties.id : undefined;

					if (!pointId) break;

					if (isMapCoordinates(feature.geometry.coordinates)) {
						setPopupVisible(false);
						setSelectedId(pointId);
						setHoveredId(undefined);

						mapInstance.easeTo({
							center: feature.geometry.coordinates,
							duration: 150,
							padding: isMobile ? { bottom: 180, right: 0 } : { right: 180, bottom: 0 },
						});

						void mapInstance.once('moveend', () => {
							setPopupVisible(true);
						});
					} else {
						setSelectedId(pointId);
						setHoveredId(undefined);
					}
					break;
				}
				default: {
					break;
				}
			}
		},
		[isMobile, setFilterOpen, setSelectedId, setPopupVisible, setHoveredId],
	);

	const onMouseMove = useCallback(
		(event: MapLayerMouseEvent | undefined) => {
			if (!event) return;

			const { point, target: mapInstance } = event;

			// Ensure all queryable layers have been loaded by MapLibre
			for (const layerId of MAP_QUERYABLE_LAYER_IDS) {
				if (!mapInstance.getLayer(layerId)) return;
			}

			const renderedFeatures = mapInstance.queryRenderedFeatures(point, {
				layers: [...MAP_QUERYABLE_LAYER_IDS],
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

					const filterControl = container.querySelector<HTMLButtonElement>(`#${CONTROL_FILTER_ID}`);

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
