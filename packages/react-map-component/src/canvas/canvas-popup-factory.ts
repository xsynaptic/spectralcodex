import type { MapPopupItem } from '@spectralcodex/map-codec';

const popupNarrowContainerPx = 640;
const popupContainerShare = 0.8;

export function getPopupLayout(containerWidth: number) {
	const isNarrow = containerWidth <= popupNarrowContainerPx;

	return {
		isNarrow,
		maxWidthPx: Math.min(isNarrow ? 300 : 350, Math.floor(containerWidth * popupContainerShare)),
	};
}

export function getPopupImageSizes(maxWidthPx: number): string {
	return `${String(maxWidthPx)}px`;
}

// The first srcSet candidate is the smallest one
export function getPopupImageSrc(srcSet: string, imageServerUrl: string): string {
	return `${imageServerUrl}${srcSet.split(', ', 1)[0]?.split(' ', 1)[0] ?? srcSet}`;
}

export function getPopupImageSrcSet(srcSet: string, imageServerUrl: string): string {
	return srcSet
		.split(', ')
		.map((entry) => `${imageServerUrl}${entry}`)
		.join(', ');
}

export function findPopupImageSrcSet(
	popupSource: Array<MapPopupItem> | undefined,
	id: string,
): string | undefined {
	// Clusters have no popup entry of their own
	if (id.startsWith('cluster-')) return undefined;

	return popupSource?.find((item) => item.id === id)?.image?.srcSet;
}
