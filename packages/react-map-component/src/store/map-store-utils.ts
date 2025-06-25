import type { MapPopupItem, MapPopupItemExtended, MapSourceItem } from '../types';
import type { MapPopupCoordinates } from '../types';

// Currently this handles Point and LineString geometry without complicated types
const getPopupCoordinates = (feature: MapSourceItem): MapPopupCoordinates => {
	if (
		typeof feature.geometry.coordinates[0] === 'number' &&
		typeof feature.geometry.coordinates[1] === 'number'
	) {
		return {
			lng: feature.geometry.coordinates[0],
			lat: feature.geometry.coordinates[1],
		};
	}

	if (Array.isArray(feature.geometry.coordinates[0])) {
		return {
			lng: feature.geometry.coordinates[0][0],
			lat: feature.geometry.coordinates[0][1],
		};
	}

	return { lng: 0, lat: 0 };
};

// Popup data is incomplete; we need to assemble some props from source data
// Default data is also provided in case of errors and other issues
export function getPopupItem({
	selectedId,
	sourceData,
	popupData,
}: {
	selectedId: string;
	sourceData: Array<MapSourceItem>;
	popupData: Array<MapPopupItem>;
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
				popupCoordinates: getPopupCoordinates(sourceItem),
			}
		: {
				precision: 1,
				popupCoordinates: {
					lng: 0,
					lat: 0,
				},
			};

	return {
		...popupItem,
		...sourceItemDetails,
	} satisfies MapPopupItemExtended;
}
