import type { GeoJSONSource, Source } from 'maplibre-gl';
import type {
	MapCallbacks,
	MapEvent,
	MapLayerMouseEvent,
	ViewStateChangeEvent,
} from 'react-map-gl/maplibre';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { useCallback, useMemo } from 'react';
import * as R from 'remeda';

import { CONTROL_FILTER_ID, MEDIA_QUERY_MOBILE } from '../constants';
import { useSourceDataQuery } from '../data/data-source';
import { useMediaQuery } from '../lib/media-query';
import { MapLayerIdEnum, MapSourceIdEnum } from '../source/source-config';
import { useMapCanvasInteractive, useMapHoveredId, useMapStoreActions } from '../store/store';
import { writeSavedViewport } from '../store/store-viewport';

const isMapGeojsonSource = (input?: Source): input is GeoJSONSource => input?.type === 'geojson';

const isMapCoordinates = (input: unknown): input is [number, number] =>
	!!input &&
	Array.isArray(input) &&
	input.length === 2 &&
	typeof input[0] === 'number' &&
	typeof input[1] === 'number';

const queryableLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsTarget,
];

export function useMapCanvasEvents({ mapId }: { mapId: string | undefined }) {
	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isInteractive = useMapCanvasInteractive();
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

	const hoveredId = useMapHoveredId();
	const {
		setCanvasLoading,
		setCanvasCursor,
		setSelectedId,
		setHoveredId,
		setFilterPosition,
		setFilterOpen,
	} = useMapStoreActions();

	const onClick = useCallback<NonNullable<MapCallbacks['onClick']>>(
		({ features, target: mapInstance }) => {
			const feature = features?.[0];

			// If the click event is not within interactive layers close any open popup and exit early
			if (!feature || !feature.layer.id || feature.geometry.type !== GeometryTypeEnum.Point) {
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
					featureSource
						.getClusterExpansionZoom(Number(clusterId))
						.then((zoom) => {
							mapInstance.easeTo({
								center: featureCenter,
								duration: 200,
								zoom,
							});
						})
						.catch(() => {
							console.warn('[Map] Could not get cluster expansion zoom!');
						});
					break;
				}

				// When a click event occurs on a feature in the unclustered-point layer, open a popup
				// TODO: fly first, then open the popup, which requires getting into tricky event handling
				case MapLayerIdEnum.Points:
				case MapLayerIdEnum.PointsTarget:
				case MapLayerIdEnum.PointsImage: {
					if (isMapCoordinates(feature.geometry.coordinates)) {
						mapInstance.flyTo({
							center: feature.geometry.coordinates,
							duration: 0, // Disabled as the animation may cause flicker
							padding: isMobile ? { bottom: 180, right: 0 } : { right: 180, bottom: 0 }, // Offset to account for the size of the popup
						});
					}

					if (typeof feature.properties.id === 'string') {
						setSelectedId(feature.properties.id);
						setHoveredId(undefined);
					}
					break;
				}
				default: {
					break;
				}
			}
		},
		[isMobile, setFilterOpen, setSelectedId, setHoveredId],
	);

	const onMouseMove = useCallback(
		(event: MapLayerMouseEvent | undefined) => {
			if (!event) return;

			const { point, target: mapInstance } = event;

			// Ensure all queryable layers have been loaded by MapLibre
			for (const layerId of queryableLayerIds) {
				if (!mapInstance.getLayer(layerId)) return;
			}

			const renderedFeatures = mapInstance.queryRenderedFeatures(point, {
				layers: queryableLayerIds,
			});

			// Note: this only queries the first matching feature, but that is sufficient
			const feature = renderedFeatures[0];

			// Nothing under the mouse, clear hover state
			if (!feature) {
				setHoveredId(undefined);
				setCanvasCursor('grab');
				return;
			}

			switch (feature.layer.id) {
				case MapLayerIdEnum.Clusters: {
					setCanvasCursor('zoom-in');

					// Cluster IDs are not the same as point IDs
					if (typeof feature.properties.cluster_id === 'number') {
						setHoveredId(`cluster-${String(feature.properties.cluster_id)}`);
					}
					break;
				}
				case MapLayerIdEnum.Points:
				case MapLayerIdEnum.PointsTarget:
				case MapLayerIdEnum.PointsImage: {
					setCanvasCursor('pointer');

					// Only update if it's different from current hovered ID
					if (typeof feature.properties.id === 'string' && feature.properties.id !== hoveredId) {
						setHoveredId(feature.properties.id);
					}
					break;
				}
				default: {
					setHoveredId(undefined);
					setCanvasCursor('grab');
					break;
				}
			}
		},
		[setCanvasCursor, setHoveredId, hoveredId],
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
		({ features }) => {
			const feature = features?.[0];

			if (feature?.layer.id === undefined) {
				setCanvasCursor('grabbing');
			}
		},
		[setCanvasCursor],
	);

	const onMouseUp = useCallback<NonNullable<MapCallbacks['onMouseUp']>>(
		({ features }) => {
			const feature = features?.[0];

			if (feature?.layer.id === undefined) {
				setCanvasCursor('grab');
			}
		},
		[setCanvasCursor],
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
