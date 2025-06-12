import type { MapCallbacks, MapEvent, MapLayerMouseEvent } from 'react-map-gl/maplibre';

import { GeometryTypeEnum } from '@spectralcodex/map-types';
import { useCallback } from 'react';
import { funnel, isIncludedIn } from 'remeda';

import { MapLayerIdEnum } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';
import { MAP_FILTER_CONTROL_ID, MEDIA_QUERY_MOBILE } from '../../constants';
import { useMediaQuery } from '../../lib/hooks/use-media-query';
import { useMapCanvasInteractive, useMapStoreActions } from '../../store/hooks/use-map-store';
import { isMapCoordinates, isMapGeojsonSource } from '../../types/map-type-guards';

export function useMapCanvasEvents() {
	const interactive = useMapCanvasInteractive();
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });
	const { setCanvasLoading } = useMapStoreActions();

	const { setCanvasCursor, setSelectedId, setFilterPosition, setFilterOpen } = useMapStoreActions();

	const onClick = useCallback(
		({ features, target: mapInstance }: MapLayerMouseEvent) => {
			const feature = features && features[0];

			// If the click event is not within interactive layers close any open popup and exit early
			if (!feature || !feature.layer.id || feature.geometry.type !== GeometryTypeEnum.Point) {
				setSelectedId(undefined);

				// This clears *all* feature states for the entire source
				// It's a simple way to clear selected state without having to know the feature ID
				mapInstance.removeFeatureState({
					source: MapSourceIdEnum.PointCollection,
				});
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
				case MapLayerIdEnum.PointsIcon: {
					if (isMapCoordinates(feature.geometry.coordinates)) {
						mapInstance.flyTo({
							center: feature.geometry.coordinates,
							duration: 0, // Disabled as the animation may cause flicker
							padding: isMobile ? { bottom: 180, right: 0 } : { right: 180, bottom: 0 }, // Offset to account for the size of the popup
						});
					}

					if (typeof feature.properties.id === 'string') {
						setSelectedId(feature.properties.id);
					}

					if (feature.id !== undefined) {
						mapInstance.setFeatureState(
							{
								source: MapSourceIdEnum.PointCollection,
								id: feature.id,
							},
							{ selected: true },
						);
					}
					break;
				}
				default: {
					break;
				}
			}
		},
		[isMobile, setFilterOpen, setSelectedId],
	);

	const onMouseEnter = useCallback(
		({ features, target: mapInstance }: MapLayerMouseEvent) => {
			const feature = features && features[0];

			switch (feature?.layer.id) {
				case MapLayerIdEnum.Clusters: {
					setCanvasCursor('zoom-in');
					break;
				}
				case MapLayerIdEnum.Points:
				case MapLayerIdEnum.PointsTarget:
				case MapLayerIdEnum.PointsIcon: {
					setCanvasCursor('pointer');

					// Set hover state for the feature
					if (feature.id !== undefined) {
						mapInstance.setFeatureState(
							{
								source: MapSourceIdEnum.PointCollection,
								id: feature.id,
							},
							{ hover: true },
						);
					}
					break;
				}
				default: {
					break;
				}
			}
		},
		[setCanvasCursor],
	);

	const onMouseLeave = useCallback(
		({ features, target: mapInstance }: MapLayerMouseEvent) => {
			const feature = features && features[0];

			// Reset hover state
			if (
				feature?.id !== undefined &&
				isIncludedIn(feature.layer.id, [
					MapLayerIdEnum.Points,
					MapLayerIdEnum.PointsTarget,
					MapLayerIdEnum.PointsIcon,
				])
			) {
				mapInstance.setFeatureState(
					{
						source: MapSourceIdEnum.PointCollection,
						id: feature.id,
					},
					{ hover: false },
				);
			}

			setCanvasCursor('grab');
		},
		[setCanvasCursor],
	);

	const onMouseDown = useCallback(
		({ features }: MapLayerMouseEvent) => {
			const feature = features && features[0];

			if (feature?.layer.id === undefined) {
				setCanvasCursor('grabbing');
			}
		},
		[setCanvasCursor],
	);

	const onMouseUp = useCallback(
		({ features }: MapLayerMouseEvent) => {
			const feature = features && features[0];

			if (feature?.layer.id === undefined) {
				setCanvasCursor('grab');
			}
		},
		[setCanvasCursor],
	);

	const debouncedOnLoad = funnel<Array<MapEvent>, HTMLElement | undefined>(
		(container) => {
			if (!container) {
				console.warn('[Map] Map instance not found!');
				return;
			}

			const filterControl = container.querySelector<HTMLButtonElement>(`#${MAP_FILTER_CONTROL_ID}`);

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
			reducer: (_, ...args: Array<MapEvent>) => {
				if (args.length === 0) return;

				return args[0]?.target.getContainer();
			},
			minQuietPeriodMs: 300,
		},
	);

	return {
		onLoad: (event: MapEvent) => {
			setCanvasLoading(false);
			if (interactive) {
				debouncedOnLoad.call(event); // Initialize the position of the filter control
			}
		},
		onResize: debouncedOnLoad.call,
		...(interactive
			? {
					onClick,
					onMouseEnter,
					onMouseLeave,
					onMouseOut: onMouseLeave,
					onMouseDown,
					onMouseUp,
				}
			: undefined),
	} satisfies MapCallbacks;
}
