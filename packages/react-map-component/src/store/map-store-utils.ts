import { GeometryTypeEnum } from '@spectralcodex/map-types';

import type { MapPopupData, MapPopupItem, MapSourceData } from '../types';

// Popup data is incomplete; we need to assemble some props from source data
// Default data is also provided in case of errors and other issues
export function getPopupItem({
	selectedId,
	sourceData,
	popupData,
}: {
	selectedId: string;
	sourceData: MapSourceData;
	popupData: MapPopupData;
}) {
	const popupItem = popupData.find((popupItem) => popupItem.id === selectedId) ?? {
		id: 'default',
		title: 'Untitled',
		titleMultilingualLang: undefined,
		titleMultilingualValue: undefined,
		url: undefined,
		description: undefined,
		safety: undefined,
		googleMapsUrl: undefined,
		wikipediaUrl: undefined,
		image: undefined,
	};

	const sourceItem = sourceData.find((sourceItem) => sourceItem.properties.id === selectedId);
	const sourceItemDetails = sourceItem
		? {
				precision: sourceItem.properties.precision,
				geometry: sourceItem.geometry,
			}
		: {
				precision: 1,
				geometry: {
					type: GeometryTypeEnum.Point,
					coordinates: [0, 0] as [number, number],
				},
			};

	return {
		...popupItem,
		...sourceItemDetails,
	} satisfies MapPopupItem;
}
