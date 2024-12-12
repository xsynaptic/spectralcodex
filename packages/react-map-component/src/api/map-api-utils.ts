import type { MapPopupDataRaw, MapSourceDataRaw } from '../types';

import { MapPopupDataSchema, MapSourceDataSchema } from '../types/map-schemas';

export function parseSourceData(sourceDataRaw: MapSourceDataRaw) {
	const { data, success, error } = MapSourceDataSchema.safeParse(sourceDataRaw);

	if (!success) {
		console.error(error);
		return;
	}

	return data;
}

export function parsePopupData(popupDataRaw: MapPopupDataRaw) {
	const { data, success, error } = MapPopupDataSchema.safeParse(popupDataRaw);

	if (!success) {
		console.error(error);
		return;
	}

	return data;
}
