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
	const sourceItem = sourceData.find((sourceItem) => sourceItem.properties.id === selectedId);
	const popupItem = popupData.find((popupItem) => popupItem.id === selectedId);

	return {
		id: 'default',
		title: 'Untitled',
		titleAlt: undefined,
		url: undefined,
		description: undefined,
		safety: undefined,
		googleMapsUrl: undefined,
		wikipediaUrl: undefined,
		image: undefined,
		precision: 1,
		geometry: {
			type: GeometryTypeEnum.Point,
			coordinates: [0, 0],
		},
		...(popupItem ? { ...popupItem } : {}),
		...(sourceItem
			? {
					precision: sourceItem.properties.precision,
					geometry: sourceItem.geometry,
				}
			: {}),
	} satisfies MapPopupItem;
}
