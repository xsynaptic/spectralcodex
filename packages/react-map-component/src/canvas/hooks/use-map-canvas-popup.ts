import { GeometryTypeEnum } from '@spectralcodex/map-types';
import maplibregl from 'maplibre-gl';
import { useMemo } from 'react';

import type { MapPopupItemExtended, MapSourceItem } from '../../types';

import { usePopupDataQuery } from '../../api/hooks/use-map-api-popup-data';
import { useSourceDataQuery } from '../../api/hooks/use-map-api-source-data';
import { useMapSelectedId } from '../../store/hooks/use-map-store';

/**
 * Extract popup coordinates from geometry using type discrimination
 * - Point: use coordinates directly
 * - LineString: use first point
 * - Polygon: use first point of outer ring
 */
function getPopupCoordinates({ geometry }: MapSourceItem): maplibregl.LngLat {
	switch (geometry.type) {
		case GeometryTypeEnum.Point: {
			const [lng, lat] = geometry.coordinates as [number, number];

			return new maplibregl.LngLat(lng, lat);
		}

		case GeometryTypeEnum.LineString: {
			const coordinates = geometry.coordinates as Array<[number, number]>;

			if (!coordinates[0]) return new maplibregl.LngLat(0, 0);

			const [lng, lat] = coordinates[0];

			return new maplibregl.LngLat(lng, lat);
		}

		case GeometryTypeEnum.Polygon: {
			const coordinates = geometry.coordinates as Array<Array<[number, number]>>;

			if (!coordinates[0]) return new maplibregl.LngLat(0, 0);
			if (!coordinates[0][0]) return new maplibregl.LngLat(0, 0);

			const [lng, lat] = coordinates[0][0];

			return new maplibregl.LngLat(lng, lat);
		}

		// Should never reach here due to MapGeometry type constraint
		default: {
			console.warn(`[Map] Unsupported geometry type for popup:`, geometry);

			return new maplibregl.LngLat(0, 0);
		}
	}
}

// Popup data is incomplete; we need to assemble some props from source data
// Default data is also provided in case of errors and other issues
export function useMapCanvasPopup() {
	const selectedId = useMapSelectedId();

	const { data: sourceData } = useSourceDataQuery();
	const { data: popupData } = usePopupDataQuery();

	return useMemo(() => {
		if (!selectedId) return;

		const selectedPopupItemProps = popupData?.find((popupItem) => popupItem.id === selectedId) ?? {
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

		const selectedSourceItem = sourceData?.find(
			(sourceItem) => sourceItem.properties.id === selectedId,
		);
		const selectedSourceItemProps = selectedSourceItem
			? {
					precision: selectedSourceItem.properties.precision,
					popupCoordinates: getPopupCoordinates(selectedSourceItem),
				}
			: {
					precision: 1,
					popupCoordinates: new maplibregl.LngLat(0, 0),
				};

		return {
			...selectedPopupItemProps,
			...selectedSourceItemProps,
		} satisfies MapPopupItemExtended;
	}, [selectedId, popupData, sourceData]);
}
