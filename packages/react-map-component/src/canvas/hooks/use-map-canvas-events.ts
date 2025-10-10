import type { GeoJSONSource, Source } from 'maplibre-gl';
import type { MapCallbacks, MapEvent, MapLayerMouseEvent } from 'react-map-gl/maplibre';

import { GeometryTypeEnum } from '@spectralcodex/map-types';
import { useCallback, useMemo } from 'react';
import { funnel } from 'remeda';

import { useSourceDataQuery } from '../../api/hooks/use-map-api-source-data';
import { MapLayerIdEnum } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';
import { MAP_FILTER_CONTROL_ID, MEDIA_QUERY_MOBILE } from '../../constants';
import { useMediaQuery } from '../../lib/hooks/use-media-query';
import {
	useMapCanvasInteractive,
	useMapHoveredId,
	useMapStoreActions,
} from '../../store/hooks/use-map-store';

const isMapGeojsonSource = (input?: Source): input is GeoJSONSource => input?.type === 'geojson';

const isMapCoordinates = (input: unknown): input is [number, number] =>
	!!input &&
	Array.isArray(input) &&
	input.length === 2 &&
	typeof input[0] === 'number' &&
	typeof input[1] === 'number';

export function useMapCanvasEvents() {
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
							throw new Error('Could not get cluster expansion zoom!');
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

			const renderedFeatures = mapInstance.queryRenderedFeatures(point, {
				layers: [MapLayerIdEnum.Clusters, MapLayerIdEnum.Points, MapLayerIdEnum.PointsTarget],
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
			funnel(onMouseMove, {
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

	const debouncedFilterControlSetup = useMemo(
		() =>
			funnel<Array<MapEvent>, HTMLElement | undefined>(
				(container) => {
					if (!container) {
						console.warn('[Map] Map instance not found!');
						return;
					}

					const filterControl = container.querySelector<HTMLButtonElement>(
						`#${MAP_FILTER_CONTROL_ID}`,
					);

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
					...(isSourceDataLoading
						? {}
						: {
								onMouseMove: throttledOnMouseMove.call,
							}),
				}
			: {}),
	} satisfies MapCallbacks;
}
