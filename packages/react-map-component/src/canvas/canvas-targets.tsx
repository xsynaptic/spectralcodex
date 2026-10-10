import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '#types.ts';

import {
	MapSelectedMarker,
	MapSyncedTargetMarkers,
	MapTargetMarkers,
} from '#canvas/canvas-markers.tsx';
import { useMapTargetIds } from '#canvas/canvas-target-ids.tsx';
import { getTargetBounds, getTargetPositions, getTargetZoom } from '#canvas/canvas-view-factory.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useDocumentEventValue } from '#lib/document-attribute.ts';
import { useMapStoreActions } from '#store/store.ts';

const fitDuration = 450;
const fitPadding = 50;

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

		const bounds = getTargetBounds(getTargetPositions(sourceData, targetIds));
		const fit = bounds ? map.cameraForBounds(bounds, { padding: fitPadding }) : undefined;

		if (!fit?.center || fit.zoom === undefined) return;

		// Attached first; under reduced motion `moveend` fires inside the call
		void map.once('moveend', () => {
			setSettledKey(key);
		});

		map.easeTo({
			center: fit.center,
			duration: fitDuration,
			zoom: getTargetZoom(map.getZoom(), fit.zoom),
		});
	}, [key, map, setSelectedId, sourceData, targetIds]);

	return settledKey === key;
}

const MapSyncedTargets: FC<{
	syncEventName: string;
	targetIds: Array<string>;
}> = function MapSyncedTargets({ syncEventName, targetIds }) {
	const isSettled = useTargetFit(targetIds, syncEventName);

	return (
		<>
			{isSettled ? <MapSyncedTargetMarkers targetIds={targetIds} /> : undefined}
			<MapSelectedMarker targetIds={targetIds} />
		</>
	);
};

export const MapTargets: FC<Pick<MapComponentProps, 'host'>> = function MapTargets({ host }) {
	const targetIds = useMapTargetIds();

	if (host) return <MapSyncedTargets syncEventName={host.syncEventName} targetIds={targetIds} />;

	return (
		<>
			<MapTargetMarkers targetIds={targetIds} />
			<MapSelectedMarker targetIds={targetIds} />
		</>
	);
};
