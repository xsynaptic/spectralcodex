import type { MapSourceItem } from '@spectralcodex/map-codec';

import { LngLat } from 'maplibre-gl';

const popupNarrowContainerPx = 640;
const popupContainerShare = 0.8;

export const popupEasePaddingPx = 180;

export function getPopupLayout(containerWidth: number) {
	const isNarrow = containerWidth <= popupNarrowContainerPx;

	return {
		isNarrow,
		maxWidthPx: Math.min(isNarrow ? 300 : 350, Math.floor(containerWidth * popupContainerShare)),
	};
}

export function getPopupCoordinates({ geometry }: MapSourceItem): LngLat {
	const [lng, lat] = geometry.coordinates;

	return new LngLat(lng, lat);
}
