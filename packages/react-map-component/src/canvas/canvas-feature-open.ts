import { useEffect } from 'react';

import type { MapHostOptions } from '#types.ts';

import { useMediaQuery } from '#lib/media-query.ts';

export interface MapFeatureOpenDetail {
	url: string;
}

// Popups stay wherever the host's query does not match
export function useFeatureOpenEventName(host: MapHostOptions | undefined) {
	const isMatch = useMediaQuery({ query: host?.featureOpenMediaQuery ?? 'not all' });

	return isMatch ? host?.featureOpenEventName : undefined;
}

export function useFeatureOpenDispatch(eventName: string | undefined, url: string | undefined) {
	useEffect(() => {
		if (!eventName || !url) return;

		document.dispatchEvent(new CustomEvent<MapFeatureOpenDetail>(eventName, { detail: { url } }));
	}, [eventName, url]);
}
