import { useEffect } from 'react';

import { useMediaQuery } from '#lib/media-query.ts';

export interface MapFeatureOpenDetail {
	url: string;
}

export interface MapFeatureOpenOptions {
	// Dispatched on `document` as a `CustomEvent<MapFeatureOpenDetail>` once the selected Feature's url is known
	eventName: string;
	// Popups stay wherever this does not match
	mediaQuery: string;
}

export function useFeatureOpenEventName(featureOpen: MapFeatureOpenOptions | undefined) {
	const isMatch = useMediaQuery({ query: featureOpen?.mediaQuery ?? 'not all' });

	return isMatch ? featureOpen?.eventName : undefined;
}

export function useFeatureOpenDispatch(eventName: string | undefined, url: string | undefined) {
	useEffect(() => {
		if (!eventName || !url) return;

		document.dispatchEvent(new CustomEvent<MapFeatureOpenDetail>(eventName, { detail: { url } }));
	}, [eventName, url]);
}
