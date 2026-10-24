import type { MapPopupItem } from '@spectralcodex/map-codec';

import { MapPopupOwnField } from '@spectralcodex/map-codec';
import * as R from 'remeda';

import { isClusterHoverId } from '#lib/cluster-hover.ts';

type MapPopupImageSources = NonNullable<MapPopupItem['popupImageSources']>;

function getOwnTitleItem({
	ownTitle,
	ownTitleMultilingualLang,
	ownTitleMultilingualValue,
}: MapPopupItem) {
	if (ownTitle !== undefined) {
		return {
			title: ownTitle,
			titleMultilingualLang: ownTitleMultilingualLang,
			titleMultilingualValue: ownTitleMultilingualValue,
		};
	}

	if (ownTitleMultilingualValue === undefined) return {};

	return {
		title: ownTitleMultilingualValue,
		titleMultilingualLang: undefined,
		titleMultilingualValue: undefined,
	};
}

export function getTargetPopupItem<
	Item extends MapPopupItem & { precision: number | undefined; url?: string | undefined },
>(item: Item): Item {
	const own = item.own ?? 0;

	return {
		...item,
		description: own & MapPopupOwnField.Description ? item.description : undefined,
		popupImageSources: own & MapPopupOwnField.Image ? item.popupImageSources : undefined,
		precision: own & MapPopupOwnField.Precision ? item.precision : undefined,
		...getOwnTitleItem(item),
		url: undefined,
		wikipediaUrl: own & MapPopupOwnField.Wikipedia ? item.wikipediaUrl : undefined,
	};
}

export function getPopupImageSizes(maxWidthPx: number): string {
	return `${String(maxWidthPx)}px`;
}

export function getPopupImageSrc(popupImageSources: MapPopupImageSources, imageBaseUrl: string) {
	const smallest = R.firstBy(popupImageSources, ({ width }) => width);

	return smallest ? `${imageBaseUrl}/${smallest.path}` : undefined;
}

export function getPopupImageSrcSet(popupImageSources: MapPopupImageSources, imageBaseUrl: string) {
	return popupImageSources
		.map(({ path, width }) => `${imageBaseUrl}/${path} ${String(width)}w`)
		.join(', ');
}

export function findPopupImageSources(
	popupSource: Array<MapPopupItem> | undefined,
	id: string,
): MapPopupImageSources | undefined {
	if (isClusterHoverId(id)) return undefined;

	return popupSource?.find((item) => item.id === id)?.popupImageSources;
}
