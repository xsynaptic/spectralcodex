import { useEffect } from 'react';

import type { MapFeatureOpenDetail, MapHostOptions } from '#types.ts';

import { mapFeatureOpenEventName } from '#constants.ts';
import { useMediaQuery } from '#lib/media-query.ts';

// Popups stay wherever the host's query does not match
export function useFeatureOpenEventName(host: MapHostOptions | undefined) {
	const isMatch = useMediaQuery({ query: host?.featureOpenMediaQuery ?? 'not all' });

	return isMatch ? mapFeatureOpenEventName : undefined;
}

export function useFeatureOpenDispatch(eventName: string | undefined, url: string | undefined) {
	useEffect(() => {
		if (!eventName || !url) return;

		document.dispatchEvent(new CustomEvent<MapFeatureOpenDetail>(eventName, { detail: { url } }));
	}, [eventName, url]);
}
