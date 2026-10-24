import type { MapPopupItem } from '@spectralcodex/map-codec';

import { MapPopupOwnField } from '@spectralcodex/map-codec';

import { isClusterHoverId } from '#lib/cluster-hover.ts';

export function getTargetPopupItem<
	Item extends MapPopupItem & { precision: number | undefined; url?: string | undefined },
>(item: Item): Item {
	const own = item.own ?? 0;

	return {
		...item,
		description: own & MapPopupOwnField.Description ? item.description : undefined,
		image: own & MapPopupOwnField.Image ? item.image : undefined,
		precision: own & MapPopupOwnField.Precision ? item.precision : undefined,
		url: undefined,
		wikipediaUrl: own & MapPopupOwnField.Wikipedia ? item.wikipediaUrl : undefined,
	};
}

export function getPopupImageSizes(maxWidthPx: number): string {
	return `${String(maxWidthPx)}px`;
}

// The first srcSet candidate is the smallest one
export function getPopupImageSrc(srcSet: string, imageBaseUrl: string): string {
	return `${imageBaseUrl}/${srcSet.split(', ', 1)[0]?.split(' ', 1)[0] ?? srcSet}`;
}

export function getPopupImageSrcSet(srcSet: string, imageBaseUrl: string): string {
	return srcSet
		.split(', ')
		.map((entry) => `${imageBaseUrl}/${entry}`)
		.join(', ');
}

export function findPopupImageSrcSet(
	popupSource: Array<MapPopupItem> | undefined,
	id: string,
): string | undefined {
	if (isClusterHoverId(id)) return undefined;

	return popupSource?.find((item) => item.id === id)?.image?.srcSet;
}
