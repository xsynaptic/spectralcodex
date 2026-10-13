import { useEffect } from 'react';

import { getSelectionOutcome, getSettledClick } from '#canvas/canvas-events-factory.ts';
import { useMapHost } from '#host/host-context.tsx';
import { sendHostIntent } from '#host/host-intent.ts';
import { useTrackMap } from '#lib/track-context.tsx';
import { useMapCanvasPopup } from '#popup/popup-hooks.ts';
import { useMapClickedId, useMapStoreActions } from '#store/store.ts';
import { useMapTargetIds } from '#view/view.tsx';

export function useMapSelection() {
	const isHosted = useMapHost() !== undefined;
	const { isLoading, popupItem } = useMapCanvasPopup();
	const targetIds = useMapTargetIds();
	const clickedId = useMapClickedId();
	const { setClickedId } = useMapStoreActions();
	const trackMap = useTrackMap();

	const id = popupItem?.id;
	const url = popupItem?.url;
	const isTarget = popupItem !== undefined && targetIds.includes(popupItem.id);

	const outcome = popupItem
		? getSelectionOutcome({
				isHosted,
				isLoading,
				isTarget,
				targetCount: targetIds.length,
				url,
			})
		: undefined;

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

	return { isLoading, isTarget, popupItem: outcome === 'popup' ? popupItem : undefined };
}
