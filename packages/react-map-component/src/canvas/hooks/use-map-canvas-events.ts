import { useCallback } from 'react';
import { debounce } from 'remeda';

import type { MapEvent, MapLayerMouseEvent } from 'react-map-gl/maplibre';

import { mapLayerIds } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';
import { MAP_FILTER_CONTROL_ID } from '../../constants';
import { useMediaQueryMobile } from '../../lib/hooks/use-media-query';
import { useMapCanvasInteractive, useMapStoreActions } from '../../store/hooks/use-map-store';
import { isMapCoordinates, isMapGeojsonSource } from '../../types/map-type-guards';

export function useMapCanvasEvents() {
	const interactive = useMapCanvasInteractive();
	const isMobile = useMediaQueryMobile();
	const { setCanvasLoading } = useMapStoreActions();

	const { setCanvasCursor, setSelectedId, setFilterPosition, setFilterOpen } = useMapStoreActions();

	const onClick = useCallback(
		({ features, target: mapInstance }: MapLayerMouseEvent) => {
			const feature = features && features[0];

			// If the click event is not within interactive layers close any open popup and exit early
			if (!feature || !feature.layer.id || feature.geometry.type !== 'Point') {
				setSelectedId(undefined);
				return;
			}

			// Close the filter if it's open; the map registered a click
			setFilterOpen(false);

			switch (feature.layer.id) {
				case mapLayerIds.clusters: {
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
				case mapLayerIds.points:
				case mapLayerIds.pointsTarget: {
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
		({ features }: MapLayerMouseEvent) => {
			const feature = features && features[0];

			switch (feature?.layer.id) {
				case mapLayerIds.clusters: {
					setCanvasCursor('zoom-in');
					break;
				}
				case mapLayerIds.points:
				case mapLayerIds.pointsTarget: {
					setCanvasCursor('pointer');
					break;
				}
				default: {
					break;
				}
			}
		},
		[setCanvasCursor],
	);

	const onMouseLeave = useCallback(() => {
		setCanvasCursor('grab');
	}, [setCanvasCursor]);

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

	const measureFilterPosition = useCallback(
		({ target: mapInstance }: MapEvent) => {
			const container = mapInstance.getContainer();
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
		[setFilterPosition],
	);

	const debouncedOnLoad = debounce(measureFilterPosition, { waitMs: 300 });

	return {
		onLoad: (event: MapEvent) => {
			setCanvasLoading(false);
			if (interactive) {
				debouncedOnLoad.call(event); // Initialize the position of the filter control
			}
		},
		onResize: (event: MapEvent) => debouncedOnLoad.call(event),
		...(interactive
			? {
					onClick,
					onMouseEnter,
					onMouseLeave,
					onMouseDown,
					onMouseUp,
				}
			: undefined),
	};
}
