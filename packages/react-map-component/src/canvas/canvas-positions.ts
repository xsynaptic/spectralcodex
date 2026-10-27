import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { PositionedPoint } from '#lib/clusters-factory.ts';

import { useMapCanvasData } from '#data/data-canvas.tsx';
import {
	createClusterLocator,
	getClusterIndex,
	noClusterPositions,
} from '#lib/clusters-factory.ts';
import { useMapConfig } from '#lib/config.tsx';
import { MapSourceIdEnum } from '#source/source-config.ts';

function useTileZoom() {
	const { current: map } = useMap();

	const subscribe = useCallback(
		(callback: () => void) => {
			map?.on('zoom', callback);

			return () => {
				map?.off('zoom', callback);
			};
		},
		[map],
	);

	const getTileZoom = useCallback(() => Math.floor(map?.getZoom() ?? 0), [map]);

	return useSyncExternalStore(subscribe, getTileZoom, () => 0);
}

function useHasPointsLoaded() {
	const { current: map } = useMap();
	const [hasLoaded, setHasLoaded] = useState(false);

	useEffect(() => {
		if (!map || hasLoaded) return;

		function check() {
			if (!map?.getSource(MapSourceIdEnum.PointCollection)) return;
			if (map.isSourceLoaded(MapSourceIdEnum.PointCollection)) setHasLoaded(true);
		}

		check();
		map.on('sourcedata', check);

		return () => {
			map.off('sourcedata', check);
		};
	}, [hasLoaded, map]);

	return hasLoaded;
}

export function useClusterPositions(points: ReadonlyArray<PositionedPoint>) {
	const { isInteractive } = useMapConfig();
	const { pointCollection } = useMapCanvasData();
	const tileZoom = useTileZoom();
	const hasPointsLoaded = useHasPointsLoaded();

	const getClusterPositions = useMemo(() => {
		if (!isInteractive || points.length === 0) return;

		return createClusterLocator(getClusterIndex(pointCollection.features), points);
	}, [isInteractive, pointCollection, points]);

	return useMemo(() => {
		if (!hasPointsLoaded) return;

		return getClusterPositions?.(tileZoom) ?? noClusterPositions;
	}, [getClusterPositions, hasPointsLoaded, tileZoom]);
}
