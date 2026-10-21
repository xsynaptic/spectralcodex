import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';

export function makeMapSourceItem(
	properties: Partial<MapSourceItem['properties']> = {},
	coordinates: [number, number] = [0, 0],
): MapSourceItem {
	return {
		geometry: { coordinates, type: GeometryTypeEnum.Point },
		properties: {
			entryQuality: 1,
			hasImage: false,
			id: 'location-id',
			precision: 3,
			rating: 3,
			status: LocationStatusEnum.Abandoned,
			title: 'Location',
			...properties,
		},
		type: 'Feature',
	};
}
