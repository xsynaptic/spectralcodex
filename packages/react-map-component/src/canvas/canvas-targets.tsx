import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapTargetSyncOptions } from '#canvas/canvas-targets-factory.ts';
import type { MapComponentProps } from '#types.ts';

import {
	MapSelectedMarker,
	MapSyncedTargetMarkers,
	MapTargetMarkers,
} from '#canvas/canvas-markers.tsx';
import {
	getTargetCamera,
	getTargetPositions,
	parseTargetIds,
} from '#canvas/canvas-targets-factory.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useDocumentAttribute, useDocumentEventValue } from '#lib/document-attribute.ts';
import { useMapStoreActions } from '#store/store.ts';

const fitDuration = 450;
const fitPadding = 50;

function useSyncedTargetIds({ attributeName, eventName }: MapTargetSyncOptions): Array<string> {
	const value = useDocumentAttribute(attributeName, eventName) ?? '';

	return useMemo(() => parseTargetIds(value), [value]);
}

// The last popup leaves its padding on the transform, so zoom would turn around an off-centre point
// The camera moves onto the screen centre as the padding goes, so nothing shifts
function clearPadding(map: MapRef) {
	if (Object.values(map.getPadding()).every((side) => side === 0)) return;

	const container = map.getContainer();

	map.jumpTo({
		center: map.unproject([container.clientWidth / 2, container.clientHeight / 2]),
		padding: { bottom: 0, left: 0, right: 0, top: 0 },
	});
}

// True once the camera has settled on the current Targets
function useTargetFit(targetIds: Array<string>, eventName: string) {
	const { current: map } = useMap();
	const { data: sourceData } = useSourceDataQuery();
	const { setSelectedId } = useMapStoreActions();

	const getWidth = useCallback(() => map?.getContainer().clientWidth ?? 0, [map]);

	// The host resizes the container as chrome beside the map comes and goes
	const width = useDocumentEventValue(eventName, getWidth, 0);

	const key = `${targetIds.join(' ')} ${String(width)}`;

	// Filters and re-renders must not re-run the fit for a Target already handled
	const handledKeyRef = useRef<string | undefined>(undefined);
	const [settledKey, setSettledKey] = useState<string | undefined>();

	useEffect(() => {
		if (!map || !sourceData || handledKeyRef.current === key) return;

		handledKeyRef.current = key;
		setSelectedId(undefined);

		// An interrupted move fires its `moveend` here, before the listener below can take it for ours
		map.stop();
		// MapLibre resizes from a throttled observer; until then the fit measures the old width
		map.resize();
		clearPadding(map);

		const camera = getTargetCamera(getTargetPositions(sourceData, targetIds), map.getZoom());

		if (!camera) return;

		// Attached first; under reduced motion `moveend` fires inside the call
		void map.once('moveend', () => {
			setSettledKey(key);
		});

		if (camera.type === 'center') {
			map.easeTo({ center: camera.center, duration: fitDuration, zoom: camera.zoom });
			return;
		}

		map.fitBounds(camera.bounds, {
			duration: fitDuration,
			linear: true,
			maxZoom: camera.maxZoom,
			padding: fitPadding,
		});
	}, [key, map, setSelectedId, sourceData, targetIds]);

	return settledKey === key;
}

const MapSyncedTargets: FC<{ targetSync: MapTargetSyncOptions }> = function MapSyncedTargets({
	targetSync,
}) {
	const targetIds = useSyncedTargetIds(targetSync);

	const isSettled = useTargetFit(targetIds, targetSync.eventName);

	return (
		<>
			{isSettled ? <MapSyncedTargetMarkers targetIds={targetIds} /> : undefined}
			<MapSelectedMarker targetIds={targetIds} />
		</>
	);
};

export const MapTargets: FC<Pick<MapComponentProps, 'targetIds' | 'targetSync'>> =
	function MapTargets({ targetIds, targetSync }) {
		if (targetSync) return <MapSyncedTargets targetSync={targetSync} />;

		return (
			<>
				{targetIds ? <MapTargetMarkers targetIds={targetIds} /> : undefined}
				<MapSelectedMarker targetIds={targetIds} />
			</>
		);
	};
