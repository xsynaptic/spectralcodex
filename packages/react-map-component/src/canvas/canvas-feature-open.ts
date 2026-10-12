import { useEffect } from 'react';

import type { MapFeatureOpenDetail } from '#types.ts';

export function useFeatureOpenDispatch(eventName: string | undefined, url: string | undefined) {
	useEffect(() => {
		if (!eventName || !url) return;

		document.dispatchEvent(new CustomEvent<MapFeatureOpenDetail>(eventName, { detail: { url } }));
	}, [eventName, url]);
}
