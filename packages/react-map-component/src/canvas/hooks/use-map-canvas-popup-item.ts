import maplibregl from 'maplibre-gl';
import { useMemo } from 'react';

import type { MapPopupItemExtended, MapSourceItem } from '../../types';

import { usePopupDataQuery } from '../../api/hooks/use-map-api-popup-data';
import { useSourceDataQuery } from '../../api/hooks/use-map-api-source-data';
import { useMapSelectedId } from '../../store/hooks/use-map-store';

// Currently this handles Point and LineString geometry without complicated types
function getPopupCoordinates(feature: MapSourceItem) {
	if (
		typeof feature.geometry.coordinates[0] === 'number' &&
		typeof feature.geometry.coordinates[1] === 'number'
	) {
		return new maplibregl.LngLat(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
	}

	// TODO: there really should be a better way to handle this
	if (Array.isArray(feature.geometry.coordinates[0])) {
		if (Array.isArray(feature.geometry.coordinates[0][0])) {
			return new maplibregl.LngLat(
				feature.geometry.coordinates[0][0][0],
				feature.geometry.coordinates[0][0][1],
			);
		}
		if (Array.isArray(feature.geometry.coordinates[0][1])) {
			return new maplibregl.LngLat(
				feature.geometry.coordinates[0][1][0],
				feature.geometry.coordinates[0][1][1],
			);
		}
		return new maplibregl.LngLat(
			feature.geometry.coordinates[0][0],
			feature.geometry.coordinates[0][1],
		);
	}

	return new maplibregl.LngLat(0, 0);
}

// Popup data is incomplete; we need to assemble some props from source data
// Default data is also provided in case of errors and other issues
export function useMapCanvasPopupItem() {
	const selectedId = useMapSelectedId();

	const { data: sourceData } = useSourceDataQuery();
	const { data: popupData } = usePopupDataQuery();

	return useMemo(() => {
		if (!selectedId || !popupData || !sourceData) return;

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
					popupCoordinates: new maplibregl.LngLat(0, 0),
				};

		return {
			...popupItem,
			...sourceItemDetails,
		} satisfies MapPopupItemExtended;
	}, [selectedId, popupData, sourceData]);
}
