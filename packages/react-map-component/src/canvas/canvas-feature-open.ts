import { useEffect } from 'react';

import type { getSelectionOutcome } from '#canvas/canvas-events-factory.ts';

import { getSettledClick } from '#canvas/canvas-events-factory.ts';
import { useMapHost } from '#host/host-context.tsx';
import { sendHostIntent } from '#host/host-intent.ts';
import { useTrackMap } from '#lib/track-context.tsx';
import { useMapClickedId, useMapStoreActions } from '#store/store.ts';

// Point ids are content hashes, so analytics reports the location's URL, which is only known once popup data has loaded
export function useSettledClick({
	id,
	isLoading,
	outcome,
	url,
}: {
	id: string | undefined;
	isLoading: boolean;
	outcome: ReturnType<typeof getSelectionOutcome> | undefined;
	url: string | undefined;
}) {
	const isHosted = useMapHost() !== undefined;
	const clickedId = useMapClickedId();
	const { setClickedId } = useMapStoreActions();
	const trackMap = useTrackMap();

	useEffect(() => {
		const settledClick = getSettledClick({ clickedId, isLoading, outcome, selectedId: id });

		if (!settledClick) return;

		setClickedId(undefined);

		if (!url) return;

		if (settledClick === 'open') {
			sendHostIntent({ kind: 'open', url });
			return;
		}

		if (!isHosted) trackMap({ data: { location: url }, name: 'map-popup-open' });
	}, [clickedId, id, isHosted, isLoading, outcome, setClickedId, trackMap, url]);
}
